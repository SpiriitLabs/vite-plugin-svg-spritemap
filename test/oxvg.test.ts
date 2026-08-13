import type { UserOptions } from '../src/types'
import { createLogger } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { logMessage } from '../src/helpers/log'
import { getOptimize, getOptions, hasStyleVariable, styleVariablesDisabledPlugins, variablesDisabledPlugins, withoutVariablesJobs } from '../src/helpers/oxvg'
import { defaultDisabledPlugins } from '../src/helpers/svgo'
import { buildVite } from './helpers/build'

const oxvgConfigs: Record<string, UserOptions['oxvg']> = {
  default: true,
  false: false,
  custom: {
    prefixIds: {
      delim: '-',
      prefixClassNames: true,
      prefixIds: true,
      prefix: { type: 'Prefix', field0: 'prefix' },
    },
  },
  // custom: {
  //   plugins: ['prefixIds'],
  // },
}

describe('oxvg getOptions', () => {
  it('returns undefined when false', async () => {
    expect(await getOptions(false, 'sprite-')).toBeUndefined()
  })

  it('returns custom config when object', async () => {
    const config = { prefixIds: { delim: '-', prefixClassNames: true, prefixIds: true, prefix: { type: 'Prefix' as const, field0: 'prefix' } } }
    expect(await getOptions(config, 'sprite-')).toEqual(config)
  })

  it('translates the SVGO default config when true/undefined', async () => {
    for (const value of [undefined, true] as const) {
      const config = await getOptions(value, 'sprite-')

      expect(Object.keys(config ?? {}).length).toBeGreaterThan(0)
      expect(config?.cleanupIds?.preservePrefixes).toEqual(['sprite-'])
      // shared with the SVGO optimizer through defaultDisabledPlugins
      for (const plugin of Object.keys(defaultDisabledPlugins))
        expect(config).not.toHaveProperty(plugin)
    }
  })
})

describe('oxvg default config', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><g fill="red"><g><path id="sprite-keep" d="M0 0h10v10z"/></g></g><path id="drop-me" d="M0 0h5v5z" data-x=""/></svg>'

  it('applies the SVGO default config so both optimizers stay on par', async () => {
    const optimize = await getOptimize(createLogger())
    expect(optimize).toBeTypeOf('function')
    if (!optimize)
      return

    const result = optimize(svg, await getOptions(true, 'sprite-'))

    // disabled through defaultDisabledPlugins, shared with the SVGO optimizer
    expect(result).toContain('<g fill="red">')
    expect(result).toContain('data-x=""')
    // cleanupIds runs, but keeps ids carrying the sprite prefix
    expect(result).toContain('id="sprite-keep"')
    expect(result).not.toContain('id="drop-me"')
  })

  it('lets an options object replace the default config', async () => {
    const optimize = await getOptimize(createLogger())
    if (!optimize)
      return

    // only prefixIds runs, so cleanupIds no longer drops the unreferenced id
    expect(optimize(svg, await getOptions(oxvgConfigs.custom, 'sprite-'))).toContain('id="prefix-drop-me"')
  })
})

describe('oxvg', () => {
  for (const key in oxvgConfigs) {
    if (Object.hasOwn(oxvgConfigs, key)) {
      it(key, async () => {
        const oxvg = oxvgConfigs[key]
        const result = await buildVite({
          name: `oxvg_${key}`,
          options: { oxvg, svgo: false },
        })
        if (!('output' in result))
          return
        const asset = result.output.find(
          asset =>
            asset.name?.startsWith('spritemap.') && asset.name.endsWith('.svg'),
        )

        expect(asset).toBeDefined()

        if (asset && 'source' in asset)
          expect(asset.source).toMatchSnapshot()
      })
    }
  }

  for (const key in oxvgConfigs) {
    if (Object.hasOwn(oxvgConfigs, key)) {
      it(`${key} with warning`, async () => {
        const spy = vi.spyOn(console, 'warn')
        vi.doMock('@oxvg/napi', async () => {})

        const oxvg = oxvgConfigs[key]
        const result = await buildVite({
          name: `oxvg_warning`,
          options: { oxvg, svgo: false },
        })
        const warningStr = logMessage('You need to install OXVG to be able to optimize your SVG with it.')

        if (oxvg === false) {
          expect(spy.mock.calls).not.toContainEqual([warningStr])
        }
        else {
          expect(spy.mock.calls).toContainEqual([warningStr])
        }

        spy.mockClear()
        vi.doUnmock('@oxvg/napi')

        if (!('output' in result))
          return
        const asset = result.output.find(
          asset =>
            asset.name?.startsWith('spritemap.') && asset.name.endsWith('.svg'),
        )

        expect(asset).toBeDefined()

        if (asset && 'source' in asset)
          expect(asset.source).toMatchSnapshot()
      })
    }
  }

  // last: `doUnmock` does not restore the module for later dynamic imports
  it('stays silent when oxvg is simply not installed', async () => {
    const spy = vi.spyOn(console, 'warn')
    // thrown from a getter, vitest wraps factory errors and loses `code`
    vi.doMock('@oxvg/napi', () => ({
      get optimise(): never {
        const error: NodeJS.ErrnoException = new Error('Cannot find module \'@oxvg/napi\'')
        error.code = 'ERR_MODULE_NOT_FOUND'
        throw error
      },
    }))

    expect(await getOptimize(createLogger())).toBe(false)
    expect(spy.mock.calls.flat().some(message => String(message).includes('native binding'))).toBe(false)

    vi.doUnmock('@oxvg/napi')
    spy.mockRestore()
  })
})

describe('oxvg variables', () => {
  // OXVG aborts on these, so they take a narrower optimizer config
  it.each([
    ['<svg fill="var(--c, red)"/>', false],
    ['<svg/>', false],
    ['<svg style="fill:var(--c, red)"/>', true],
    ['<svg style=\'fill:var(--c, red)\'/>', true],
    ['<svg><style>.a{fill:var(--c, red)}</style></svg>', true],
    ['<svg><style type="text/css">.a{fill:var(--c, red)}</style ></svg>', true],
    // a css function name is case-insensitive, and missing one aborts the process
    ['<svg style="fill:VAR(--c, red)"/>', true],
    ['<svg><style>.a{fill:Var(--c, red)}</style></svg>', true],
    // not a var() call, so the icon keeps the full optimizer config
    ['<svg style="font-family:myvar(x)"/>', false],
    // a presentation attribute merely ending in `style` is not a style declaration
    ['<svg><text font-style="var(--s, italic)"/></svg>', false],
  ])('detects a var() in a style declaration: %s', (source, expected) => {
    expect(hasStyleVariable(source)).toBe(expected)
  })

  it('drops the jobs that mangle the var() the sprite carries', async () => {
    const plain = await getOptions(true, 'sprite-')
    const forVariables = withoutVariablesJobs('<svg fill="var(--c, red)"/>', plain)
    const forStyleVariables = withoutVariablesJobs('<svg style="fill:var(--c, red)"/>', plain)

    for (const plugin of Object.keys(variablesDisabledPlugins)) {
      expect(plain).toHaveProperty(plugin)
      expect(forVariables).not.toHaveProperty(plugin)
    }

    // a `var()` in a style declaration needs the wider set
    for (const plugin of Object.keys(styleVariablesDisabledPlugins))
      expect(forStyleVariables).not.toHaveProperty(plugin)

    expect(forVariables).toHaveProperty('convertPathData')
  })

  it('hands the config straight back for a sprite without a var()', () => {
    const config = { removeUselessStrokeAndFill: {} }
    expect(withoutVariablesJobs('<svg fill="red"/>', config)).toBe(config)
  })

  it('leaves a disabled optimizer disabled', () => {
    expect(withoutVariablesJobs('<svg style="fill:var(--c, red)"/>', undefined)).toBeUndefined()
  })

  // honoured verbatim otherwise, but the copy for `var()` sprites drops the job
  it('protects a user supplied config without mutating it', async () => {
    const config = { ...oxvgConfigs.custom as object, removeUselessStrokeAndFill: {} } as Exclude<UserOptions['oxvg'], boolean | undefined>

    expect(await getOptions(config, 'sprite-')).toEqual(config)

    const mitigated = withoutVariablesJobs('<svg stroke="var(--c, red)"/>', await getOptions(config, 'sprite-'))
    expect(mitigated).not.toHaveProperty('removeUselessStrokeAndFill')
    expect(mitigated).toHaveProperty('prefixIds')
    expect(config).toHaveProperty('removeUselessStrokeAndFill')
  })

  // the corruption is independent of the value being themable, so
  // `variables: false` needs protecting too
  it.each([undefined, false] as const)('keeps a var() stroke and its siblings (variables: %s)', async (variables) => {
    const result = await buildVite({
      name: `oxvg_variables_stroke_${variables}`,
      path: './fixtures/basic/variables/themable.svg',
      options: { oxvg: true, svgo: false, variables },
    })

    if (!('output' in result))
      return

    const asset = result.output.find(chunk => chunk.fileName.endsWith('.svg'))
    const source = asset && 'source' in asset ? String(asset.source) : ''

    expect(source).toContain('stroke="var(--color, #fff)"')
    expect(source).toContain('stroke-width="var(--weight, 2)"')
  })

  // ⚠️ this aborts the process (SIGABRT) without the mitigation, so a regression
  // kills the vitest worker instead of failing the assertion
  it('optimizes a var() in a style declaration instead of crashing', async () => {
    const result = await buildVite({
      name: 'oxvg_variables_style',
      path: './fixtures/basic/variables-style/*.svg',
      options: { oxvg: true, svgo: false },
    })

    if (!('output' in result))
      return

    const asset = result.output.find(chunk => chunk.fileName.endsWith('.svg'))
    const source = asset && 'source' in asset ? String(asset.source) : ''

    expect(source).toContain('var(--color')
    // still optimized: minifyStyles dropped the space after the comma
    expect(source).toContain('style="fill:var(--color,#fff)"')
    // a stroke declaration survives too, in a `style` attribute and in `<style>`
    expect(source).toContain('style="stroke:var(--color,#fff);stroke-width:2px"')
    expect(source).toContain('style="stroke:var(--color,#fff)"')
    // one aborting job each: removeHiddenElems, then mergePaths
    expect(source).toContain('style="opacity:var(--fade,1)"')
    expect(source).toContain('<path d="M2 2h8v8H2Z" style="fill:var(--twin,red)"/>')
    expect(source).toContain('<path d="M14 14h8v8h-8Z" style="fill:var(--twin,red)"/>')
  })
})
