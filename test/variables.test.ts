import { promises as fs } from 'node:fs'
import { DOMParser } from '@xmldom/xmldom'
import less from 'less'
import { chromium } from 'playwright'
import * as sass from 'sass'
import stylus from 'stylus'
import { describe, expect, it, vi } from 'vitest'
import { extractSvgVariables, resolveVariableTokens, sortVariableDefaults, variableToken } from '../src/helpers/variables'
import { buildVite } from './helpers/build'
import { getPath } from './helpers/path'

const VARIABLES_GLOB = './fixtures/basic/variables/*.svg'
/** `--a` and `--a___b`: the token of the first is a prefix of the token of the second. */
const SHADOW_GLOB = './fixtures/basic/variables-shadow/*.svg'
/** A default holding an xml entity, next to one made of several tokens. */
const ENTITY_GLOB = './fixtures/basic/variables-entity/*.svg'
/** A default holding a backslash, which no preprocessor unescapes the same way. */
const LITERAL_GLOB = './fixtures/basic/variables-literal/*.svg'
/** Defaults no generated stylesheet can quote verbatim: a line break, a `@{` and a raw `'`. */
const QUOTING_GLOB = './fixtures/basic/variables-quoting/*.svg'

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

/** Indented lines of a rule body, so a leaked one cannot go unnoticed. */
function bodyLines(css: string): string[] {
  return css.split('\n').filter(line => /^\s+\S/.test(line))
}

/** The svg source the plugin derives from a parse result, defaults baked in. */
function resolve(result: { template: string, defaults: Map<string, string> }): string {
  return resolveVariableTokens(result.template, sortVariableDefaults(result.defaults))
}

function decodeUri(uri: string): string {
  return decodeURIComponent(uri.replace(/^data:image\/svg\+xml,/, ''))
}

/** Attribute value off a parsed document, so an entity and its character compare equal. */
function attribute(document: string, tag: string, name: string): string {
  return new DOMParser()
    .parseFromString(document, 'image/svg+xml')
    .getElementsByTagName(tag)[0]
    ?.getAttribute(name) ?? ''
}

/** Text of the `<style>` element, so an entity and its character compare equal. */
function styleText(document: string): string {
  const style = new DOMParser()
    .parseFromString(document, 'image/svg+xml')
    .getElementsByTagName('style')[0]

  return style?.textContent ?? ''
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

  // `--12` is the one css allows that an object would list first, undoing the sort
  it.each(['var(--1color, #fff)', 'var(--12, #fff)', 'var(--, #fff)', 'var(--a b, #fff)'])('rejects the invalid name in %s', (value) => {
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

  it('warns on an external url() default', () => {
    const result = extractSvgVariables('<svg fill="var(--a, url(paint.svg))"/>')
    expect(result?.warnings).toEqual([expect.stringContaining('external `url()`')])
  })

  // it resolves against the icon's own document, which the data uri carries along
  it.each([
    ['bare', '<svg fill="var(--a, url(#grad))"/>'],
    ['quoted', '<svg fill=\'var(--a, url("#grad"))\'/>'],
    ['spaced', '<svg fill="var(--a, url( #grad ))"/>'],
  ])('stays quiet on a %s url(#id) default', (_name, source) => {
    expect(extractSvgVariables(source)?.warnings).toEqual([])
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

  // an editor may write every element out with its namespace prefix, and it is the
  // same element: leaving it out both misses the variable and aborts OXVG
  it('extracts a var() from a namespaced style element', () => {
    const result = extractSvgVariables('<svg:svg><svg:style>.a{fill:var(--hover, #f00)}</svg:style></svg:svg>')
    expect(result?.defaults).toEqual(new Map([['hover', '#f00']]))
    expect(result?.template).toBe('<svg:svg><svg:style>.a{fill:___hover___}</svg:style></svg:svg>')
  })

  it('leaves an element that merely ends in style alone', () => {
    const result = extractSvgVariables('<svg><mystyle>.a{fill:var(--c, red)}</mystyle></svg>')
    expect(result?.defaults.size).toBe(0)
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

  it('matches the call case-insensitively, as css matches a function name', () => {
    const result = extractSvgVariables('<svg><path fill="VAR(--color, #fff)"/></svg>')
    expect(result?.defaults).toEqual(new Map([['color', '#fff']]))
    expect(result?.template).toBe('<svg><path fill="___color___"/></svg>')
  })

  it('leaves a name that merely ends in var alone, without warning', () => {
    expect(extractSvgVariables('<svg><path style="font-family:myvar(x)"/></svg>')).toBeNull()
  })

  it('ignores a commented out attribute', () => {
    const source = '<svg><!-- <path fill="var(--ghost, red)"/> --><path fill="var(--c, blue)"/></svg>'
    const result = extractSvgVariables(source)
    expect(result?.defaults).toEqual(new Map([['c', 'blue']]))
    expect(result?.template).toBe('<svg><!-- <path fill="var(--ghost, red)"/> --><path fill="___c___"/></svg>')
  })

  it('closes the call past a quoted delimiter escaped with a backslash', () => {
    const result = extractSvgVariables('<svg><path fill=\'var(--a, "x\\")y")\'/></svg>')
    expect(result?.defaults).toEqual(new Map([['a', '"x\\")y"']]))
    expect(result?.template).toBe('<svg><path fill=\'___a___\'/></svg>')
  })

  // text content is not markup, whatever it reads like
  it('ignores an attribute written inside a text node', () => {
    const source = '<svg><desc>fill="var(--ghost, red)"</desc><path fill="var(--c, blue)"/></svg>'
    const result = extractSvgVariables(source)
    expect(result?.defaults).toEqual(new Map([['c', 'blue']]))
    expect(result?.template).toBe('<svg><desc>fill="var(--ghost, red)"</desc><path fill="___c___"/></svg>')
  })

  it('keeps scanning past an attribute value holding a closing bracket', () => {
    const result = extractSvgVariables('<svg><path data-x="a>b" fill="var(--c, red)"/></svg>')
    expect(result?.defaults).toEqual(new Map([['c', 'red']]))
    expect(result?.template).toBe('<svg><path data-x="a>b" fill="___c___"/></svg>')
  })

  it('resolves two tokens that sit next to each other', () => {
    const defaults = sortVariableDefaults(new Map([['a', '1'], ['b', '2']]))
    expect(resolveVariableTokens('___a______b___', defaults)).toBe('12')
  })

  it('leaves a token alone when nothing declares it', () => {
    expect(resolveVariableTokens('___a___', {})).toBe('___a___')
  })

  // css, not markup: an optimizer strips the section but both may be off
  it('ignores an attribute written inside a cdata section', () => {
    const source = '<svg><![CDATA[fill="var(--ghost, red)"]]><path fill="var(--c, blue)"/></svg>'
    const result = extractSvgVariables(source)
    expect(result?.defaults).toEqual(new Map([['c', 'blue']]))
    expect(result?.template).toBe('<svg><![CDATA[fill="var(--ghost, red)"]]><path fill="___c___"/></svg>')
  })

  it('still reads the attributes of a tag that is never closed', () => {
    const result = extractSvgVariables('<svg fill="var(--c, red)"')
    expect(result?.defaults).toEqual(new Map([['c', 'red']]))
    expect(result?.template).toBe('<svg fill="___c___"')
  })

  // malformed markup never reaches the plugin, the parser rejects the icon first,
  // but the walk still has to end rather than read past the source
  it('reads a style element that is never closed to the end of the source', () => {
    const result = extractSvgVariables('<svg><style>.a{fill:var(--c, red)}')
    expect(result?.defaults).toEqual(new Map([['c', 'red']]))
    expect(result?.template).toBe('<svg><style>.a{fill:___c___}')
  })

  it('leaves everything past a comment that is never closed alone', () => {
    const source = '<svg><!-- <path fill="var(--ghost, red)"/>'
    const result = extractSvgVariables(source)
    expect(result?.defaults).toEqual(new Map())
    expect(result?.template).toBe(source)
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

  // the mixin is the only thing that can substitute a token
  it('skips the template uri when no mixin is emitted', async () => {
    async function withInclude(name: string, include: string[]): Promise<string> {
      const filename = getPath(`./fixtures/basic/styles/spritemap_${name}.scss`)
      await buildVite({
        name: `variables_${name}`,
        path: VARIABLES_GLOB,
        options: { styles: { filename, lang: 'scss', include } },
      })
      return fs.readFile(filename, 'utf8')
    }

    const withMixin = await withInclude('tpl_mixin', ['data', 'mixin'])
    const without = await withInclude('tpl_nomixin', ['data'])

    expect(withMixin).toContain('uri-template:')
    // the defaults map stays, only the uri nothing can read is dropped
    expect(without).toContain('$sprites-variables: (')
    expect(without).not.toContain('uri-template:')
    expect(without.length).toBeLessThan(withMixin.length)
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

    // an all-empty defaults map would be dead weight, so it is not written at all
    expect(withFeature).toBe(withoutFeature)
  })

  // the mixin always mentions the map, only its declaration is conditional
  it.each([
    ['scss', '$sprites-variables: ('],
    ['styl', '$sprites-variables = {'],
  ] as const)('writes the defaults map only for a themable set (%s)', async (lang, declaration) => {
    expect(await generate('map_on', lang)).toContain(declaration)
    expect(await generate('map_off', lang, {}, './fixtures/basic/svg/*.svg')).not.toContain(declaration)
  })

  // scss and styl guard their lookup and warn, Less has no way to, so its map is
  // written whenever the mixin is: without it the lookup is a compile error
  it('writes the defaults map for less even when nothing is themable', async () => {
    expect(await generate('map_on', 'less')).toContain('@sprites-variables: {')
    expect(await generate('map_off', 'less', {}, './fixtures/basic/svg/*.svg')).toContain('@sprites-variables: {')
  })

  // an entry per sprite would be a dead line for every icon that themes nothing,
  // and both mixins read a missing key back as an empty map
  it.each([
    ['scss', '$sprites-variables: (', ');'],
    ['styl', '$sprites-variables = {', '}'],
  ] as const)('leaves a sprite that declares nothing out of the defaults map (%s)', async (lang, open, close) => {
    const generated = await generate('sparse', lang)
    const start = generated.indexOf(open)
    const map = generated.slice(start, generated.indexOf(`\n${close}`, start))

    expect(map).toContain('\'themable\': ')
    // `plain` and `invalid-name` declare nothing, unlike the six other sprites
    expect(map).not.toContain('\'plain\'')
    expect(map).not.toContain('\'invalid-name\'')
  })

  // Less is the exception, so its map keeps the sprite with a `0` count
  it('keeps a sprite that declares nothing in the less defaults map', async () => {
    expect(await generate('sparse', 'less')).toContain('@plain: 0;')
  })
})

describe('variables spritemap output', () => {
  // `resolve` writes a default straight back into the source, the one path where no
  // downstream tool collapses the run for us: without it a wrapped default renders
  // differently there than through either uri
  it('normalizes a resolved default exactly like both uris', async () => {
    const output = await buildVite({
      name: 'variables_spritemap_normalize',
      path: QUOTING_GLOB,
      options: { variables: { spritemap: 'resolve' }, svgo: false, oxvg: false },
    }) as { output: Array<{ fileName: string, source?: string }> }

    const spritemap = String(output.output.find(chunk => chunk.fileName.endsWith('.svg'))?.source)

    expect(attribute(spritemap, 'path', 'stroke-dasharray')).toBe('4 2')
    expect(attribute(spritemap, 'text', 'font-family')).toBe('\'Fira Sans\'')
  })

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

  it('warns on a css reference, and only for an override (styl)', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const generated = await generate('stylwarn', 'styl')

    try {
      renderStylus([generated, '.a', '\tsprite(\'themable\', $variables: { \'color\': \'var(--x, red)\' })'].join('\n'))
      expect(spy.mock.calls.flat().join('\n')).toContain('cannot see the page from inside a data uri')

      // a css function name is case-insensitive, and an uppercase call is just as inert
      spy.mockClear()
      renderStylus([generated, '.a', '\tsprite(\'themable\', $variables: { \'color\': \'VAR(--x, red)\' })'].join('\n'))
      expect(spy.mock.calls.flat().join('\n')).toContain('cannot see the page from inside a data uri')

      // `weight` keeps its default, which is not a reference and must stay quiet
      spy.mockClear()
      renderStylus([generated, '.a', '\tsprite(\'themable\', $variables: { \'color\': red })'].join('\n'))
      expect(spy.mock.calls.flat().join('\n')).not.toContain('cannot see the page from inside a data uri')
    }
    finally {
      spy.mockRestore()
    }
  })

  // the sprite is absent from the map rather than holding an empty entry, so the
  // lookup has to fall back and warn from there, and leave the icon untouched
  it('warns on a sprite that declares nothing, absent from the map (styl)', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const generated = await generate('stylsparse', 'styl')

    try {
      const css = renderStylus([generated, '.a', '\tsprite(\'plain\', $variables: { \'color\': red })'].join('\n'))
      expect(spy.mock.calls.flat().join('\n')).toContain('"plain" does not declare any variable')
      expect(decodeUri(urls(css)[0])).toContain('fill=\'lime\'')
    }
    finally {
      spy.mockRestore()
    }
  })

  // the name you got wrong is the useless half of the warning, the ones that exist
  // are the actionable half, and scss has always listed them
  it('names the available variables on an unknown one (styl)', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const generated = await generate('stylavailable', 'styl')

    try {
      renderStylus([generated, '.a', '\tsprite(\'themable\', $variables: { \'nope\': red })'].join('\n'))
      expect(spy.mock.calls.flat().join('\n')).toContain('has no variable named "nope", available: weight color.')
    }
    finally {
      spy.mockRestore()
    }
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

    // a bare `merge()` used to be written out here as raw text
    for (const line of bodyLines(css))
      expect(line).toMatch(/^\s+[\w-]+: .*;$/)

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
    ['a css reference', '.a { @include sprite(\'themable\', $variables: (\'color\': \'var(--x, red)\')); }', 'cannot see the page from inside a data uri'],
    // a css function name is case-insensitive, and an uppercase call is just as inert
    ['an uppercase css reference', '.a { @include sprite(\'themable\', $variables: (\'color\': \'VAR(--x, red)\')); }', 'cannot see the page from inside a data uri'],
    ['an uppercase url reference', '.a { @include sprite(\'themable\', $variables: (\'color\': \'URL(#a)\')); }', 'cannot see the page from inside a data uri'],
  ])('warns on %s', async (_name, call, expected) => {
    const generated = await generate('warn', 'scss')
    const warnings: string[] = []
    sass.compileString(`${generated}\n${call}`, { logger: { warn: message => warnings.push(message) } })

    expect(warnings).toEqual([expect.stringContaining(expected)])
  })

  // a function token is an identifier immediately followed by `(`, so a name that
  // merely ends in `var`/`url` is not a call and must not warn, as in the plugin
  it.each(['myvar(x)', 'notmyurl(x)', 'my-var(x)'])('stays quiet on %s (scss and styl)', async (value) => {
    const message = 'cannot see the page from inside a data uri'

    const warnings: string[] = []
    sass.compileString(
      `${await generate('guard', 'scss')}\n.a { @include sprite('themable', $variables: ('color': '${value}')); }`,
      { logger: { warn: warning => warnings.push(warning) } },
    )
    expect(warnings.join('\n')).not.toContain(message)

    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      renderStylus([
        await generate('guard', 'styl'),
        '.a',
        `\tsprite('themable', $variables: { 'color': '${value}' })`,
      ].join('\n'))
      expect(spy.mock.calls.flat().join('\n')).not.toContain(message)
    }
    finally {
      spy.mockRestore()
    }
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

  // Less cannot test a variable for existence, so the map has to exist for the
  // mixin's lookup to resolve even when nothing at all is themable
  it('compiles when nothing declares a variable', async () => {
    const generated = await generate('lessnomap', 'less', { variables: false })
    expect(generated).toContain('@sprites-variables: {')

    const css = await renderLess(`${generated}
.a { .sprite('themable', @variables: 'color' red); }`)

    // nothing was extracted, so the authored `var()` survives verbatim
    expect(decodeUri(urls(css)[0])).toContain('fill=\'var(--color, white)\'')
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

  // Less parses the comma as the start of the next pair and has no `@warn` to say so
  it('drops what follows an unquoted comma, and keeps a quoted one whole', async () => {
    const generated = await generate('lesscomma', 'less')
    const css = await renderLess(`${generated}
.a { .sprite('escape'; @variables: 'font' Arial, sans-serif); }
.b { .sprite('escape'; @variables: 'font' 'Arial, sans-serif'); }`)

    const [unquoted, quoted] = urls(css).map(decodeUri)
    expect(unquoted).toContain('font-family=\'Arial\'')
    expect(quoted).toContain('font-family=\'Arial, sans-serif\'')
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
  /** Property names only: the uri differs per engine and is compared elsewhere. */
  function properties(css: string): string[] {
    return [...css.matchAll(/^\s+([\w-]+):/gm)].map(match => match[1])
  }

  // `@{mode}` keeps the quotes of a quoted value and emits `'mask':`, and Less reads
  // `box` and `'box'` as two values where sass and stylus compare them equal: either
  // slip drops a declaration silently, and the docs quote both arguments everywhere
  it.each(['quoted', 'bare'] as const)('emits the same properties for a %s mode and size', async (form) => {
    const q = form === 'quoted' ? '\'' : ''

    const scssCss = sass.compileString(`${await generate(`mode_${form}`, 'scss')}
.a { @include sprite('themable', $include-size: ${q}box${q}, $mode: ${q}mask${q}, $variables: ('color': red)); }`).css

    const stylCss = renderStylus([
      await generate(`mode_${form}`, 'styl'),
      '.a',
      `\tsprite('themable', $include-size: ${q}box${q}, $mode: ${q}mask${q}, $variables: { 'color': red })`,
    ].join('\n'))

    const lessCss = await renderLess(`${await generate(`mode_${form}`, 'less')}
.a { .sprite('themable'; @include-size: ${q}box${q}; @mode: ${q}mask${q}; @variables: 'color' red); }`)

    expect(properties(scssCss)).toEqual(['mask', 'width', 'height'])
    expect(properties(stylCss)).toEqual(properties(scssCss))
    expect(properties(lessCss)).toEqual(properties(scssCss))
  })

  // the same slip on `$type` emitted nothing at all in Less, not even a partial
  it.each(['quoted', 'bare'] as const)('renders the %s fragment type in every lang', async (form) => {
    const q = form === 'quoted' ? '\'' : ''

    const scssCss = sass.compileString(`${await generate(`type_${form}`, 'scss')}
.a { @include sprite('themable', $type: ${q}fragment${q}); }`).css

    const stylCss = renderStylus([
      await generate(`type_${form}`, 'styl'),
      '.a',
      `\tsprite('themable', $type: ${q}fragment${q})`,
    ].join('\n'))

    const lessCss = await renderLess(`${await generate(`type_${form}`, 'less')}
.a { .sprite('themable'; @type: ${q}fragment${q}); }`)

    for (const css of [scssCss, stylCss, lessCss]) {
      expect(properties(css)).toEqual(['background'])
      // Less quotes the fragment with `'`, the other two with `"`
      expect(urls(css).map(url => url.replace(/^'|'$/g, ''))).toEqual(['/__spritemap#sprite-themable-view'])
    }
  })

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

  // a default comes out of the svg source, where `&` is already written as an
  // entity: escaping it like a call site value would render `&quot;` as literal text
  it('leaves a default holding an entity alone when a sibling is overridden', async () => {
    const scssCss = sass.compileString(`${await generate('entity', 'scss', {}, ENTITY_GLOB)}
.a { @include sprite('entity', $variables: ('dash': '8 3')); }
.b { @include sprite('entity'); }`).css

    const stylCss = renderStylus([
      await generate('entity', 'styl', {}, ENTITY_GLOB),
      '.a',
      '\tsprite(\'entity\', $variables: { \'dash\': \'8 3\' })',
      '.b',
      '\tsprite(\'entity\')',
    ].join('\n'))

    // the override is deliberately unquoted, so it spans two list items in Less
    const lessCss = await renderLess(`${await generate('entity', 'less', {}, ENTITY_GLOB)}
.a { .sprite('entity'; @variables: 'dash' 8 3); }
.b { .sprite('entity'); }`)

    for (const css of [scssCss, stylCss, lessCss]) {
      const [themed, untouched] = urls(css).map(decodeUri)

      expect(themed).toContain('font-family=\'&quot;Fira Sans&quot;, serif\'')
      expect(themed).toContain('stroke-dasharray=\'8 3\'')
      expect(untouched).toContain('font-family=\'&quot;Fira Sans&quot;, serif\'')
      expect(untouched).toContain('stroke-dasharray=\'4 2\'')
    }
  })

  // a `\` is an escape to sass alone, so doubling it for sass left the other two
  // with a literal `\\`: overriding one variable used to corrupt an untouched sibling
  it('carries a default holding a backslash through untouched', async () => {
    const scssCss = sass.compileString(`${await generate('literal', 'scss', {}, LITERAL_GLOB)}
.a { @include sprite('literal', $variables: ('color': '#f00')); }
.b { @include sprite('literal'); }`).css

    const stylCss = renderStylus([
      await generate('literal', 'styl', {}, LITERAL_GLOB),
      '.a',
      '\tsprite(\'literal\', $variables: { \'color\': \'#f00\' })',
      '.b',
      '\tsprite(\'literal\')',
    ].join('\n'))

    const lessCss = await renderLess(`${await generate('literal', 'less', {}, LITERAL_GLOB)}
.a { .sprite('literal'; @variables: 'color' '#f00'); }
.b { .sprite('literal'); }`)

    for (const css of [scssCss, stylCss, lessCss]) {
      // the uri sits in a `url("...")`, a css string: a raw `\` opens an escape there
      expect(css).not.toContain('\\')

      const [themed, untouched] = urls(css).map(decodeUri)

      expect(themed).toContain('fill=\'#f00\'')
      // an entity and the character itself parse to the same document, the doubled
      // `\\` the escaping used to emit does not
      for (const text of [styleText(themed), styleText(untouched)]) {
        expect(text).toContain('\\2014')
        expect(text).not.toContain('\\\\')
      }
    }
  })

  // the only check the css tokenizer takes part in: every other one reads the uri out
  // of the stylesheet text, a step before the tokenizer gets to it
  it('reads the substituted uri back out of a browser unchanged', async () => {
    const value = 'a%b\'c&d<e>f?g+h$i{j}k,l;m(n)o p'

    const scssCss = sass.compileString(`${await generate('readback', 'scss', {}, LITERAL_GLOB)}
.a { @include sprite('literal', $variables: ('color': "${value}")); }
.b { @include sprite('literal'); }`).css

    const stylCss = renderStylus([
      await generate('readback', 'styl', {}, LITERAL_GLOB),
      '.a',
      `\tsprite('literal', $variables: { 'color': "${value}" })`,
      '.b',
      '\tsprite(\'literal\')',
    ].join('\n'))

    const lessCss = await renderLess(`${await generate('readback', 'less', {}, LITERAL_GLOB)}
.a { .sprite('literal'; @variables: 'color' "${value}"); }
.b { .sprite('literal'); }`)

    const browser = await chromium.launch()
    try {
      const page = await browser.newPage()

      for (const css of [scssCss, stylCss, lessCss]) {
        await page.setContent(`<style>${css}</style><div class="a"></div><div class="b"></div>`)

        // `.a` is the substituted template, `.b` the baked uri: the `\` default reaches
        // each of them by a different route
        for (const [index, selector] of ['.a', '.b'].entries()) {
          const read = await page.evaluate(one =>
            getComputedStyle(document.querySelector(one)!).backgroundImage, selector)

          // decoded on both sides: each engine percent-encodes a different subset, and
          // the browser re-encodes on the way out
          expect(decodeURIComponent(read.replace(/^url\("|"\)$/g, '')))
            .toBe(decodeURIComponent(urls(css)[index]))
        }
      }
    }
    finally {
      await browser.close()
    }
  })

  // from a call site, which only the mixin's escape table covers. Sass resolves `\g`
  // in its own string literal, hence the doubled spelling
  it('encodes a backslash an override brings in', async () => {
    const scssCss = sass.compileString(`${await generate('literal_call', 'scss', {}, LITERAL_GLOB)}
.a { @include sprite('literal', $variables: ('mark': '"a\\\\gb"')); }`).css

    const stylCss = renderStylus([
      await generate('literal_call', 'styl', {}, LITERAL_GLOB),
      '.a',
      '\tsprite(\'literal\', $variables: { \'mark\': \'"a\\gb"\' })',
    ].join('\n'))

    const lessCss = await renderLess(`${await generate('literal_call', 'less', {}, LITERAL_GLOB)}
.a { .sprite('literal'; @variables: 'mark' '"a\\gb"'); }`)

    for (const css of [scssCss, stylCss, lessCss]) {
      expect(css).not.toContain('\\')
      expect(styleText(decodeUri(urls(css)[0]))).toBe('.literal::before{content:"a\\gb"}')
    }
  })

  // stylus rejects a `\"` inside a string outright, so the whole stylesheet used to
  // fail to compile. Reachable without an optimizer: both of them turn a `"` into an entity
  it('quotes a default holding a raw double quote', async () => {
    const noOptimizer = { svgo: false, oxvg: false }

    const scssCss = sass.compileString(`${await generate('raw', 'scss', noOptimizer, LITERAL_GLOB)}
.a { @include sprite('literal', $variables: ('color': '#f00')); }`).css

    const stylCss = renderStylus([
      await generate('raw', 'styl', noOptimizer, LITERAL_GLOB),
      '.a',
      '\tsprite(\'literal\', $variables: { \'color\': \'#f00\' })',
    ].join('\n'))

    const lessCss = await renderLess(`${await generate('raw', 'less', noOptimizer, LITERAL_GLOB)}
.a { .sprite('literal'; @variables: 'color' '#f00'); }`)

    const decoded = [scssCss, stylCss, lessCss].map(css => decodeUri(urls(css)[0]))

    expect(decoded[1]).toBe(decoded[0])
    expect(decoded[2]).toBe(decoded[0])
    expect(styleText(decoded[0])).toBe('.literal::before{content:"\\2014"}')
  })

  // three defaults the quoting used to mangle, each on a different lexer: a line break
  // ends a sass string and took the whole stylesheet with it, a `@{` interpolates in
  // less, and a raw `'` collides with the delimiter `mini-svg-data-uri` normalizes
  // every `"` to. Reachable without an optimizer, which would collapse the line break
  it('quotes a default no lexer takes verbatim, on both uris', async () => {
    const noOptimizer = { svgo: false, oxvg: false }

    const scssCss = sass.compileString(`${await generate('quoting', 'scss', noOptimizer, QUOTING_GLOB)}
.a { @include sprite('quoting'); }
.b { @include sprite('quoting', $variables: ('color': '#f00')); }`).css

    const stylCss = renderStylus([
      await generate('quoting', 'styl', noOptimizer, QUOTING_GLOB),
      '.a',
      '\tsprite(\'quoting\')',
      '.b',
      '\tsprite(\'quoting\', $variables: { \'color\': \'#f00\' })',
    ].join('\n'))

    const lessCss = await renderLess(`${await generate('quoting', 'less', noOptimizer, QUOTING_GLOB)}
.a { .sprite('quoting'); }
.b { .sprite('quoting'; @variables: 'color' '#f00'); }`)

    for (const css of [scssCss, stylCss, lessCss]) {
      // the baked uri and the substituted template have to be the same document, so
      // overriding one variable never changes what its untouched siblings render
      const [baked, themed] = urls(css).map(decodeUri)

      for (const document of [baked, themed]) {
        expect(attribute(document, 'text', 'font-family')).toBe('\'Fira Sans\'')
        expect(attribute(document, 'text', 'data-label')).toBe('a@{x}b')
        expect(attribute(document, 'path', 'stroke-dasharray')).toBe('4 2')
      }

      // a color `mini-svg-data-uri` has no shorter name for, which it would otherwise
      // rewrite in the baked uri alone
      expect(attribute(baked, 'path', 'stroke')).toBe('#123456')
      expect(attribute(themed, 'path', 'stroke')).toBe('#f00')
    }
  })
})
