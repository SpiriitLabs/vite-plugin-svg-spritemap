import { describe, expect, it } from 'vitest'
import { createOptions } from '../src/helpers/options'

describe('createOptions route', () => {
  it('derives the name from an object url without leading slash', () => {
    const { options, logs } = createOptions({ route: { url: '__icons' } })

    expect(options.route.name).toBe('__icons')
    expect(options.route.url).toBe('/__icons')
    expect(logs.warn).toContainEqual(expect.stringContaining('leading slash'))
  })

  it.each([
    ['/', 'spritemap'],
    ['', 'spritemap'],
  ])('refuses a root route (%s) and falls back to the default', (route, name) => {
    const { options, logs } = createOptions({ route })

    expect(options.route.url).toBe('/__spritemap')
    expect(options.route.name).toBe(name)
    expect(logs.warn).toContainEqual(expect.stringContaining('site root'))
  })

  it('keeps an explicit name when refusing a root route', () => {
    const { options } = createOptions({ route: { url: '/', name: 'icons' } })

    expect(options.route.url).toBe('/__spritemap')
    expect(options.route.name).toBe('icons')
  })
})

describe('createOptions injectSvgOnDev', () => {
  it('lets an explicit false win over the deprecated spelling', () => {
    const { options, logs } = createOptions({ injectSvgOnDev: false, injectSVGOnDev: true })

    expect(options.injectSvgOnDev).toBe(false)
    expect(logs.warn).toContainEqual(expect.stringContaining('deprecated'))
  })

  it('still falls back to the deprecated spelling when unset', () => {
    const { options } = createOptions({ injectSVGOnDev: true })

    expect(options.injectSvgOnDev).toBe(true)
  })
})

describe('createOptions styles lang', () => {
  it.each([
    ['out.SCSS', 'scss'],
    ['out.Less', 'less'],
    ['out.STYL', 'styl'],
    ['out.CSS', 'css'],
  ])('reads %s as %s', (filename, lang) => {
    const fromString = createOptions({ styles: filename })
    const fromObject = createOptions({ styles: { filename } })

    for (const { options, logs } of [fromString, fromObject]) {
      expect(typeof options.styles === 'object' && options.styles.lang).toBe(lang)
      expect(logs.warn).not.toContainEqual(expect.stringContaining('Invalid styles lang'))
    }
  })

  it('still falls back to css for an unknown extension', () => {
    const { options, logs } = createOptions({ styles: 'out.sass' })

    expect(typeof options.styles === 'object' && options.styles.lang).toBe('css')
    expect(logs.warn).toContainEqual(expect.stringContaining('Invalid styles lang'))
  })
})

describe('createOptions optimizers', () => {
  // a conditional config hands `null` over, and OXVG reads it as "run your own
  // preset", which aborts the process on a `var()` in a style declaration
  it.each(['svgo', 'oxvg'] as const)('normalizes a null %s to the default', (optimizer) => {
    const { options } = createOptions({
      // deliberately outside the union, to cover a plain js caller
      [optimizer]: null as unknown as boolean,
    })

    expect(options[optimizer]).toBeUndefined()
  })

  it.each(['svgo', 'oxvg'] as const)('leaves an explicit %s alone', (optimizer) => {
    expect(createOptions({ [optimizer]: false }).options[optimizer]).toBe(false)
    expect(createOptions({ [optimizer]: true }).options[optimizer]).toBe(true)
  })
})

describe('createOptions styles include', () => {
  // on its own the mixin generates a stylesheet whose first call is an undefined
  // variable, in all three languages
  it('adds the declarations the mixin cannot do without', () => {
    const { options, logs } = createOptions({ styles: { filename: 'out.scss', include: ['mixin'] } })

    expect(typeof options.styles === 'object' && options.styles.include).toEqual(['mixin', 'data'])
    expect(logs.warn).toContainEqual(expect.stringContaining('"mixin" needs "data"'))
  })

  it.each([
    [true],
    [false],
    [['mixin', 'data']],
    [['data']],
    [['bg', 'mask']],
  ] as const)('leaves %s alone', (include) => {
    const { options, logs } = createOptions({ styles: { filename: 'out.scss', include } })

    expect(typeof options.styles === 'object' && options.styles.include).toEqual(include)
    expect(logs.warn.filter(warning => warning.includes('include'))).toEqual([])
  })

  // the pre-7.2 name of the declarations block, from before an icon could declare
  // a variable of its own
  it('renames the deprecated "variables" entry', () => {
    const { options, logs } = createOptions({ styles: { filename: 'out.scss', include: ['variables', 'mixin'] } })

    expect(typeof options.styles === 'object' && options.styles.include).toEqual(['data', 'mixin'])
    expect(logs.warn).toContainEqual(expect.stringContaining('"variables" is now "data"'))
    expect(logs.warn.filter(warning => warning.includes('needs "data"'))).toEqual([])
  })

  it('renames a "variables" entry sitting next to a "data" one only once', () => {
    const { options } = createOptions({ styles: { filename: 'out.scss', include: ['data', 'variables'] } })

    expect(typeof options.styles === 'object' && options.styles.include).toEqual(['data'])
  })
})

describe('createOptions variables', () => {
  it('defaults to preserving var() in the spritemap', () => {
    expect(createOptions().options.variables).toEqual({ spritemap: 'preserve' })
  })

  it('accepts false as a full opt-out', () => {
    expect(createOptions({ variables: false }).options.variables).toBe(false)
  })

  // spelling the default out has to be allowed, as it is for `svgo` and `oxvg`
  it('accepts true as the default', () => {
    expect(createOptions({ variables: true }).options.variables).toEqual({ spritemap: 'preserve' })
  })

  it.each(['preserve', 'resolve'] as const)('passes %s through', (spritemap) => {
    expect(createOptions({ variables: { spritemap } }).options.variables).toEqual({ spritemap })
  })

  it('warns and falls back on an unknown spritemap mode', () => {
    const { options, logs } = createOptions({
      // deliberately outside the union, to cover a plain js caller
      variables: { spritemap: 'nope' as 'preserve' },
    })

    expect(options.variables).toEqual({ spritemap: 'preserve' })
    expect(logs.warn).toContainEqual(expect.stringContaining('Invalid variables.spritemap value'))
  })

  // the string belongs to `variables.spritemap`, so taking it for the default would
  // silently disagree with the spritemap the user asked for
  it.each(['resolve', 'preserve', null, 0] as const)('warns and falls back on %s', (value) => {
    const { options, logs } = createOptions({
      // deliberately outside the union, to cover a plain js caller
      variables: value as unknown as boolean,
    })

    expect(options.variables).toEqual({ spritemap: 'preserve' })
    expect(logs.warn).toContainEqual(expect.stringContaining('Invalid variables value'))
  })

  it.each([undefined, true, false, { spritemap: 'resolve' }] as const)('stays quiet on %s', (variables) => {
    const { logs } = createOptions({ variables })
    expect(logs.warn.filter(warning => warning.includes('Invalid variables value'))).toEqual([])
  })

  it('defaults the variables map name', () => {
    for (const styles of ['out.scss', { filename: 'out.scss' }]) {
      const { options } = createOptions({ styles })
      expect(typeof options.styles === 'object' && options.styles.names.variables).toBe('sprites-variables')
    }
  })

  it('takes a custom variables map name', () => {
    const { options } = createOptions({ styles: { filename: 'out.scss', names: { variables: 'themes' } } })
    expect(typeof options.styles === 'object' && options.styles.names.variables).toBe('themes')
  })

  // two names collapse into one declaration and the second silently wins, which
  // compiles to nothing rather than failing
  it('warns when two styles names collide', () => {
    const { logs } = createOptions({ styles: { filename: 'out.scss', names: { sprites: 'x', variables: 'x' } } })
    expect(logs.warn).toContainEqual(expect.stringContaining('Duplicate styles name "x"'))
  })

  it('stays quiet when every styles name is distinct', () => {
    const { logs } = createOptions({ styles: { filename: 'out.scss' } })
    expect(logs.warn.filter(warning => warning.includes('Duplicate styles name'))).toEqual([])
  })
})
