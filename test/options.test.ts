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

describe('createOptions variables', () => {
  it('defaults to preserving var() in the spritemap', () => {
    expect(createOptions().options.variables).toEqual({ spritemap: 'preserve' })
  })

  it('accepts false as a full opt-out', () => {
    expect(createOptions({ variables: false }).options.variables).toBe(false)
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
})
