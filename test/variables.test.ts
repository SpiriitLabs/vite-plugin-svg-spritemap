import { promises as fs } from 'node:fs'
import { DOMParser } from '@xmldom/xmldom'
import less from 'less'
import * as sass from 'sass'
import stylus from 'stylus'
import { describe, expect, it, vi } from 'vitest'
import { extractSvgVariables, resolveVariableTokens, sortVariableDefaults, variableToken } from '../src/helpers/variables'
import { buildVite } from './helpers/build'
import { getPath } from './helpers/path'

const VARIABLES_GLOB = './fixtures/basic/variables/*.svg'
/** `--a` and `--a___b`: the token of the first is a prefix of the token of the second. */
const SHADOW_GLOB = './fixtures/basic/variables-shadow/*.svg'

function generate(name: string, lang: 'scss' | 'styl' | 'less' | 'css', options: Record<string, unknown> = {}, path = VARIABLES_GLOB) {
  const filename = getPath(`./fixtures/basic/styles/spritemap_${name}.${lang}`)
  return buildVite({
    name: `variables_${name}_${lang}`,
    path,
    options: { styles: { filename, lang }, ...options },
  }).then(() => fs.readFile(filename, 'utf8'))
}

/** Read to the closing quote: a `var()` left in the uri contributes a `)`. */
function urls(css: string): string[] {
  return [...css.matchAll(/url\((?:"([^"]*)"|([^)]*))\)/g)].map(match => match[1] ?? match[2])
}

/** The svg source the plugin derives from a parse result, defaults baked in. */
function resolve(result: { template: string, defaults: Map<string, string> }): string {
  return resolveVariableTokens(result.template, sortVariableDefaults(result.defaults))
}

function decodeUri(uri: string): string {
  return decodeURIComponent(uri.replace(/^data:image\/svg\+xml,/, ''))
}

async function renderLess(source: string): Promise<string> {
  return (await less.render(source)).css
}

function renderStylus(source: string): string {
  let css = ''
  let error: Error | undefined
  stylus.render(source, {}, (err, result) => {
    error = err ?? undefined
    css = result
  })
  if (error)
    throw error
  return css
}

describe('variables parsing', () => {
  it('returns null when the svg declares nothing', () => {
    expect(extractSvgVariables('<svg fill="red"/>')).toBeNull()
  })

  it('extracts name, default and token', () => {
    const result = extractSvgVariables('<svg><path fill="var(--color, #fff)"/></svg>')
    expect(result?.defaults).toEqual(new Map([['color', '#fff']]))
    expect(result?.template).toBe('<svg><path fill="___color___"/></svg>')
    expect(resolve(result!)).toBe('<svg><path fill="#fff"/></svg>')
    expect(result?.warnings).toEqual([])
  })

  it.each([
    ['var(--color)', ''],
    ['var(--color,)', ''],
    ['var( --color , #fff )', '#fff'],
    ['var(--color, rgba(0,0,0,.5))', 'rgba(0,0,0,.5)'],
  ])('parses %s', (value, expected) => {
    const result = extractSvgVariables(`<svg fill="${value}"/>`)
    expect(result?.defaults.get('color')).toBe(expected)
  })

  it('substitutes several vars inside one attribute value', () => {
    const result = extractSvgVariables('<svg stroke-dasharray="var(--a,2) var(--b,4)"/>')
    expect(result?.defaults).toEqual(new Map([['a', '2'], ['b', '4']]))
    expect(result?.template).toBe('<svg stroke-dasharray="___a___ ___b___"/>')
    expect(resolve(result!)).toBe('<svg stroke-dasharray="2 4"/>')
  })

  it('keeps the first default and warns on a conflict', () => {
    const result = extractSvgVariables('<svg><a fill="var(--c, #fff)"/><b fill="var(--c, #000)"/></svg>')
    expect(result?.defaults.get('c')).toBe('#fff')
    // the winning default is what both occurrences resolve to
    expect(resolve(result!)).toBe('<svg><a fill="#fff"/><b fill="#fff"/></svg>')
    expect(result?.warnings).toEqual([expect.stringContaining('Conflicting defaults for `--c`')])
  })

  it('prefers a non-empty default over an empty one without warning', () => {
    const result = extractSvgVariables('<svg><a fill="var(--c)"/><b fill="var(--c, #000)"/></svg>')
    expect(result?.defaults.get('c')).toBe('#000')
    expect(result?.warnings).toEqual([])
  })

  it.each(['var(--1color, #fff)', 'var(--, #fff)', 'var(--a b, #fff)'])('rejects the invalid name in %s', (value) => {
    const result = extractSvgVariables(`<svg fill="${value}"/>`)
    expect(result?.defaults.size).toBe(0)
    expect(result?.template).toBe(`<svg fill="${value}"/>`)
    expect(result?.warnings).toEqual([expect.stringContaining('Invalid variable name')])
  })

  it('abandons an unbalanced var()', () => {
    const result = extractSvgVariables('<svg fill="var(--c, #fff"/>')
    expect(result?.defaults.size).toBe(0)
    expect(result?.warnings).toEqual([expect.stringContaining('Unbalanced')])
  })

  it('keeps a nested var() as the default and warns', () => {
    const result = extractSvgVariables('<svg fill="var(--a, var(--b, 2))"/>')
    expect(result?.defaults.get('a')).toBe('var(--b, 2)')
    expect(result?.template).toBe('<svg fill="___a___"/>')
    expect(result?.warnings).toEqual([expect.stringContaining('nested `var()`')])
  })

  it('warns on a url() default', () => {
    const result = extractSvgVariables('<svg fill="var(--a, url(#grad))"/>')
    expect(result?.warnings).toEqual([expect.stringContaining('`url()`')])
  })

  // a style declaration wins over a presentation attribute, and some properties
  // (`transform-origin`, `mix-blend-mode`) have no usable attribute form
  it('extracts a style attribute like any other', () => {
    const result = extractSvgVariables('<svg style="mix-blend-mode:var(--blend, normal)"/>')
    expect(result?.defaults).toEqual(new Map([['blend', 'normal']]))
    expect(result?.template).toBe('<svg style="mix-blend-mode:___blend___"/>')
    expect(result?.warnings).toEqual([])
  })

  it('extracts several declarations of one style attribute', () => {
    const result = extractSvgVariables('<svg style="fill:var(--color, #fff);stroke-width:var(--weight, 2)"/>')
    expect(result?.defaults).toEqual(new Map([['color', '#fff'], ['weight', '2']]))
    expect(result?.template).toBe('<svg style="fill:___color___;stroke-width:___weight___"/>')
  })

  // `inlineStyles` hoists a plain rule into an attribute, but a `:hover` or an
  // `@media` rule survives, and a `<style>` element is the only way to write one
  it('extracts a var() from a style element', () => {
    const result = extractSvgVariables('<svg><style>.a:hover{fill:var(--hover, #f00)}</style><path class="a"/></svg>')
    expect(result?.defaults).toEqual(new Map([['hover', '#f00']]))
    expect(result?.template).toBe('<svg><style>.a:hover{fill:___hover___}</style><path class="a"/></svg>')
    expect(result?.warnings).toEqual([])
  })

  it('extracts from a style element and an attribute in source order', () => {
    const result = extractSvgVariables('<svg><style>.a{stroke:var(--edge, blue)}</style><path fill="var(--color, #fff)"/></svg>')
    expect(result?.template).toBe('<svg><style>.a{stroke:___edge___}</style><path fill="___color___"/></svg>')
    expect(result?.defaults).toEqual(new Map([['edge', 'blue'], ['color', '#fff']]))
  })

  it('names the style element in a warning', () => {
    const result = extractSvgVariables('<svg><style>.a{fill:var(--1bad, red)}</style></svg>')
    expect(result?.warnings).toEqual([expect.stringContaining('in `<style>`')])
  })

  // it is css there, not an attribute of the document
  it('ignores an attribute selector inside a style element', () => {
    const source = '<svg><style>[data-x="var(--c, red)"]{fill:blue}</style></svg>'
    const result = extractSvgVariables(source)
    expect(result?.defaults).toEqual(new Map([['c', 'red']]))
    expect(result?.template).toBe('<svg><style>[data-x="___c___"]{fill:blue}</style></svg>')
  })

  it('ignores var() outside of an attribute value', () => {
    expect(extractSvgVariables('<svg><title>var(--color, #fff)</title></svg>')?.defaults.size).toBe(0)
  })

  it('skips the var namespace declaration', () => {
    const result = extractSvgVariables('<svg xmlns:var="var(--x, 1)" fill="var(--c, red)"/>')
    expect(result?.defaults).toEqual(new Map([['c', 'red']]))
    expect(result?.warnings).toEqual([])
  })

  it('orders defaults longest name first so tokens cannot shadow one another', () => {
    const defaults = new Map([['a', '1'], ['a-b', '2'], ['b', '3']])
    expect(Object.keys(sortVariableDefaults(defaults))).toEqual(['a-b', 'a', 'b'])
  })

  it('builds the token the templates replace', () => {
    expect(variableToken('color')).toBe('___color___')
  })
})

describe('variables generation', () => {
  it('emits a template uri and a defaults map (scss)', async () => {
    const result = await generate('gen', 'scss')
    expect(result).toMatchSnapshot()
  })

  it('emits a template uri and a defaults map (styl)', async () => {
    const result = await generate('gen', 'styl')
    expect(result).toMatchSnapshot()
  })

  it('emits a template uri and a defaults map (less)', async () => {
    const result = await generate('gen', 'less')
    expect(result).toMatchSnapshot()
  })

  it('warns only for css, the one lang without a mixin', async () => {
    const spy = vi.spyOn(console, 'warn')
    const message = 'Icon variables cannot be substituted'

    for (const lang of ['scss', 'styl', 'less'] as const) {
      spy.mockClear()
      await generate(`lang_${lang}`, lang)
      expect(spy.mock.calls.flat().join('\n')).not.toContain(message)
    }

    spy.mockClear()
    await generate('lang_css', 'css')
    expect(spy.mock.calls.flat().join('\n')).toContain(message)
    spy.mockClear()
  })

  it('only emits a template uri for sprites that declare a variable', async () => {
    const result = await generate('template', 'scss')

    const themable = result.match(/'themable': \([^)]*\)/)?.[0] ?? ''
    expect(themable).toContain('uri-template:')

    const plain = result.match(/'plain': \([^)]*\)/)?.[0] ?? ''
    expect(plain).not.toContain('uri-template:')
  })

  it('bakes the defaults into the directly usable uri', async () => {
    const result = await generate('baked', 'css')
    const themable = result.match(/\.sprite-themable \{[^}]*\}/)?.[0] ?? ''

    // a `var()` in a data uri could only ever resolve to its own fallback
    expect(themable).not.toContain('var(')
    expect(themable).toContain('stroke-width=\'2\'')
  })

  it('leaves sprites without variables byte-identical', async () => {
    const on = getPath('./fixtures/basic/styles/spritemap_invariant_on.scss')
    const off = getPath('./fixtures/basic/styles/spritemap_invariant_off.scss')

    await buildVite({ name: 'variables_invariant_on', options: { styles: { filename: on, lang: 'scss' } } })
    await buildVite({ name: 'variables_invariant_off', options: { styles: { filename: off, lang: 'scss' }, variables: false } })

    const withFeature = await fs.readFile(on, 'utf8')
    const withoutFeature = await fs.readFile(off, 'utf8')

    // the only difference is the added, all-empty defaults map
    expect(withFeature.replace(/\n\$sprites-variables: \([\s\S]*?\);\n/, '')).toBe(withoutFeature)
  })
})

describe('variables spritemap output', () => {
  it.each(['preserve', 'resolve'] as const)('writes %s into the emitted spritemap', async (spritemap) => {
    const output = await buildVite({
      name: `variables_spritemap_${spritemap}`,
      path: VARIABLES_GLOB,
      options: { variables: { spritemap } },
    }) as { output: Array<{ fileName: string, source?: string }> }

    const asset = output.output.find(chunk => chunk.fileName.endsWith('.svg'))
    const source = String(asset?.source)

    const themable = source.match(/<symbol id="sprite-themable".*?<\/symbol>/s)?.[0] ?? ''

    if (spritemap === 'preserve') {
      expect(themable).toContain('fill="var(--color, #fff)"')
      expect(themable).toContain('stroke-width="var(--weight, 2)"')
    }
    else {
      expect(themable).not.toContain('var(')
      expect(themable).toContain('fill="#fff"')
      expect(themable).toContain('stroke-width="2"')
    }
  })
})

describe('variables substitution', () => {
  it('substitutes overrides and defaults (scss)', async () => {
    const generated = await generate('compile', 'scss')
    const { css } = sass.compileString(`${generated}
.unthemed { @include sprite('themable'); }
.themed { @include sprite('themable', $variables: ('color': red, 'weight': 3)); }
.partial { @include sprite('themable', $variables: ('color': red)); }
.plain { @include sprite('plain'); }`)

    const [unthemed, themed, partial, plain] = urls(css).map(decodeUri)

    // `mini-svg-data-uri` shortens `#fff` to the equivalent `white`
    expect(unthemed).toContain('fill=\'white\'')
    expect(unthemed).toContain('stroke-width=\'2\'')
    expect(unthemed).not.toContain('___')

    expect(themed).toContain('fill=\'red\'')
    expect(themed).toContain('stroke-width=\'3\'')
    expect(themed).not.toContain('___')

    // an override leaves every other variable on its declared default
    expect(partial).toContain('fill=\'red\'')
    expect(partial).toContain('stroke-width=\'2\'')

    expect(plain).toContain('fill=\'lime\'')
  })

  // a `:hover` rule cannot be inlined into an attribute, so this is the only way to
  // theme it, and an internal `<style>` does apply inside a data uri
  it('substitutes a variable declared in a style element (scss)', async () => {
    const filename = getPath('./fixtures/basic/styles/spritemap_style_element.scss')
    await buildVite({
      name: 'variables_style_element',
      path: './fixtures/basic/variables-style/hover-element.svg',
      options: { styles: { filename, lang: 'scss' } },
    })

    const { css } = sass.compileString(`${await fs.readFile(filename, 'utf8')}
.unthemed { @include sprite('hover-element'); }
.themed { @include sprite('hover-element', $variables: ('hover': blue)); }`)

    const [unthemed, themed] = urls(css).map(decodeUri)

    expect(unthemed).toContain(':hover{fill:red}')
    expect(unthemed).not.toContain('___')
    expect(themed).toContain(':hover{fill:blue}')
  })

  // the point of supporting them: a property with no usable attribute form
  it('substitutes a variable declared in a style attribute (scss)', async () => {
    const filename = getPath('./fixtures/basic/styles/spritemap_style_attr.scss')
    await buildVite({
      name: 'variables_style_attr',
      path: './fixtures/basic/variables-style/style-attr.svg',
      options: { styles: { filename, lang: 'scss' } },
    })

    const { css } = sass.compileString(`${await fs.readFile(filename, 'utf8')}
.unthemed { @include sprite('style-attr'); }
.themed { @include sprite('style-attr', $variables: ('color': red)); }`)

    const [unthemed, themed] = urls(css).map(decodeUri)

    expect(unthemed).toContain('style=\'fill:white\'')
    expect(unthemed).not.toContain('___')
    expect(themed).toContain('style=\'fill:red\'')
  })

  it('substitutes overrides and defaults (styl)', async () => {
    const generated = await generate('compile', 'styl')
    const css = renderStylus([
      generated,
      '.unthemed',
      '\tsprite(\'themable\')',
      '.themed',
      '\tsprite(\'themable\', $variables: { \'color\': red, \'weight\': 3 })',
      '.plain',
      '\tsprite(\'plain\')',
    ].join('\n'))

    const [unthemed, themed, plain] = urls(css).map(decodeUri)

    expect(unthemed).toContain('fill=\'white\'')
    expect(unthemed).not.toContain('___')

    // stylus normalises the `red` keyword to a hex colour before we see it
    expect(themed).toContain('fill=\'#f00\'')
    expect(themed).toContain('stroke-width=\'3\'')
    expect(themed).not.toContain('___')

    expect(plain).toContain('fill=\'lime\'')
  })

  it('keeps the substituted uri a valid, well-formed document', async () => {
    const generated = await generate('escape', 'scss')
    const { css } = sass.compileString(`${generated}
.a { @include sprite('escape', $variables: ('color': '#f00', 'font': "a%b'c\\"d&e<f>g\$h")); }`)

    const uri = urls(css)[0]

    // a bare `#` truncates the uri at the fragment, a bare `"` ends the css string
    expect(uri).not.toContain('#')
    expect(uri).not.toContain('"')

    const decoded = decodeUri(uri)
    expect(decoded).toContain('fill=\'#f00\'')
    // `'` delimits attributes here, and percent-decoding happens before the xml
    // is parsed, so an entity is the only way to carry a literal quote
    expect(decoded).toContain('&apos;')
    expect(decoded).toContain('&quot;')
    expect(decoded).toContain('&amp;')
    expect(decoded).toContain('&lt;')

    const errors: string[] = []
    new DOMParser({ onError: message => errors.push(String(message)) }).parseFromString(decoded, 'image/svg+xml')
    expect(errors).toEqual([])
  })

  it('compiles when the defaults map was never emitted', async () => {
    // no map is emitted at all, so the mixin's lookup has to stay guarded
    const generated = await generate('nomap', 'scss', { variables: false })
    expect(generated).not.toContain('$sprites-variables: (')

    const warnings: string[] = []
    const { css } = sass.compileString(
      `${generated}\n.a { @include sprite('themable', $variables: ('color': red)); }`,
      { logger: { warn: message => warnings.push(message) } },
    )

    // nothing was extracted, so the authored `var()` survives verbatim
    expect(decodeUri(urls(css)[0])).toContain('fill=\'var(--color, white)\'')
    expect(warnings).toEqual([expect.stringContaining('does not declare any variable')])
  })

  it('applies the mode and size arguments alongside variables', async () => {
    const generated = await generate('args', 'scss')
    const { css } = sass.compileString(`${generated}
.a { @include sprite('themable', true, 'uri', 'mask', $variables: ('color': red)); }`)

    expect(css).toContain('mask: url(')
    expect(css).toContain('mask-size: 24px 24px')
    expect(decodeUri(urls(css)[0])).toContain('fill=\'red\'')
  })

  it('warns and ignores variables on the fragment type', async () => {
    const generated = await generate('fragment', 'scss')
    const warnings: string[] = []
    const { css } = sass.compileString(
      `${generated}\n.a { @include sprite('themable', $type: 'fragment', $variables: ('color': red)); }`,
      { logger: { warn: message => warnings.push(message) } },
    )

    expect(css).toContain('#sprite-themable-view')
    expect(warnings).toEqual([expect.stringContaining('cannot be applied to the "fragment" type')])
  })

  it.each([
    ['an unknown variable name', '.a { @include sprite(\'themable\', $variables: (\'nope\': red)); }', 'has no variable named'],
    ['a sprite without variables', '.a { @include sprite(\'plain\', $variables: (\'color\': red)); }', 'does not declare any variable'],
    ['a css reference', '.a { @include sprite(\'themable\', $variables: (\'color\': \'var(--x, red)\')); }', 'inert inside a data uri'],
  ])('warns on %s', async (_name, call, expected) => {
    const generated = await generate('warn', 'scss')
    const warnings: string[] = []
    sass.compileString(`${generated}\n${call}`, { logger: { warn: message => warnings.push(message) } })

    expect(warnings).toEqual([expect.stringContaining(expected)])
  })
})

describe('variables substitution (less)', () => {
  it('substitutes overrides and defaults', async () => {
    const generated = await generate('lesscompile', 'less')
    const css = await renderLess(`${generated}
.unthemed { .sprite('themable'); }
.single { .sprite('themable', @variables: 'color' red); }
.multiple { .sprite('themable'; @variables: 'color' red, 'weight' 5); }
.plain { .sprite('plain'); }`)

    const [unthemed, single, multiple, plain] = urls(css).map(decodeUri)

    expect(unthemed).toContain('fill=\'white\'')
    expect(unthemed).not.toContain('___')

    // a lone `key value` pair and a comma list of pairs are both accepted
    expect(single).toContain('fill=\'red\'')
    expect(single).toContain('stroke-width=\'2\'')
    expect(single).not.toContain('___')

    expect(multiple).toContain('fill=\'red\'')
    expect(multiple).toContain('stroke-width=\'5\'')
    expect(multiple).not.toContain('___')

    expect(plain).toContain('fill=\'lime\'')
  })

  it('applies the mode and size arguments alongside variables', async () => {
    const generated = await generate('lessargs', 'less')
    const css = await renderLess(`${generated}
.a { .sprite('themable'; @include-size: true; @mode: mask; @variables: 'color' red); }`)

    expect(css).toContain('mask: url(')
    expect(css).toContain('mask-size: 24px 24px')
    expect(decodeUri(urls(css)[0])).toContain('fill=\'red\'')
  })

  it('ignores variables that the sprite does not declare', async () => {
    const generated = await generate('lessunknown', 'less')
    const css = await renderLess(`${generated}
.a { .sprite('themable', @variables: 'nope' red); }
.b { .sprite('plain', @variables: 'color' red); }`)

    const [unknown, none] = urls(css).map(decodeUri)

    // Less has no `@warn`, so an unknown name is silently a no-op and the
    // declared defaults still fill every token
    expect(unknown).toContain('fill=\'#fff\'')
    expect(unknown).not.toContain('___')
    expect(none).toContain('fill=\'lime\'')
  })

  it('keeps the substituted uri a valid, well-formed document', async () => {
    const generated = await generate('lessescape', 'less')
    const css = await renderLess(`${generated}
.a { .sprite('escape'; @variables: 'color' '#f00', 'font' "a%b'c&d<e>f?g+h"); }`)

    const uri = urls(css)[0]
    expect(uri).not.toContain('#')
    expect(uri).not.toContain('"')

    const decoded = decodeUri(uri)
    expect(decoded).toContain('fill=\'#f00\'')
    expect(decoded).toContain('&apos;')
    expect(decoded).toContain('&amp;')
    expect(decoded).toContain('&lt;')

    const errors: string[] = []
    new DOMParser({ onError: message => errors.push(String(message)) }).parseFromString(decoded, 'image/svg+xml')
    expect(errors).toEqual([])
  })

  it('handles hyphenated names and partial attribute values', async () => {
    const generated = await generate('lessmulti', 'less')
    const css = await renderLess(`${generated}
.a { .sprite('multi'; @variables: 'dash-a' 6, 'dash-b' 12); }
.b { .sprite('multi', @variables: 'dash-b' 12); }`)

    const [both, one] = urls(css).map(decodeUri)

    expect(both).toContain('stroke-dasharray=\'6 12\'')
    expect(one).toContain('stroke-dasharray=\'2 12\'')
  })

  it('renders the fragment type without touching variables', async () => {
    const generated = await generate('lessfragment', 'less')
    const css = await renderLess(`${generated}
.a { .sprite('themable'; @type: 'fragment'; @variables: 'color' red); }`)

    expect(css).toContain('#sprite-themable-view')
  })
})

describe('variables cross-language equivalence', () => {
  it('substitutes identically in scss, styl and less', async () => {
    const value = 'a%b\'c&d<e>f?g+h'

    const scssCss = sass.compileString(`${await generate('equiv', 'scss')}
.a { @include sprite('escape', $variables: ('color': '#f00', 'font': "${value}")); }`).css

    const stylCss = renderStylus([
      await generate('equiv', 'styl'),
      '.a',
      `\tsprite('escape', $variables: { 'color': '#f00', 'font': "${value}" })`,
    ].join('\n'))

    const lessCss = await renderLess(`${await generate('equiv', 'less')}
.a { .sprite('escape'; @variables: 'color' '#f00', 'font' "${value}"); }`)

    const decoded = [scssCss, stylCss, lessCss].map(css => decodeUri(urls(css)[0]))

    // percent encoding casing may differ per engine, the decoded document must not
    expect(decoded[1]).toBe(decoded[0])
    expect(decoded[2]).toBe(decoded[0])
    expect(decoded[0]).toContain('fill=\'#f00\'')
    expect(decoded[0]).toContain('a%b&apos;c&amp;d&lt;e>f?g+h')
  })

  // the shortest name is written first on purpose: substituting `___a___` before
  // `___a___b___` would eat its prefix and leave a `_b___` behind, so every lang
  // has to walk the defaults (longest name first) rather than the user's list
  it('substitutes a name whose token is a prefix of another', async () => {
    const scssCss = sass.compileString(`${await generate('shadow', 'scss', {}, SHADOW_GLOB)}
.a { @include sprite('shadow', $variables: ('a': 'green', 'a___b': 'yellow')); }`).css

    const stylCss = renderStylus([
      await generate('shadow', 'styl', {}, SHADOW_GLOB),
      '.a',
      '\tsprite(\'shadow\', $variables: { \'a\': \'green\', \'a___b\': \'yellow\' })',
    ].join('\n'))

    const lessCss = await renderLess(`${await generate('shadow', 'less', {}, SHADOW_GLOB)}
.a { .sprite('shadow'; @variables: 'a' 'green', 'a___b' 'yellow'); }`)

    for (const css of [scssCss, stylCss, lessCss]) {
      const decoded = decodeUri(urls(css)[0])
      expect(decoded).toContain('fill=\'green\'')
      expect(decoded).toContain('stroke=\'yellow\'')
      expect(decoded).not.toContain('___')
    }
  })
})
