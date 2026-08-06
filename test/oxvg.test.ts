import type { UserOptions } from '../src/types'
import { createLogger } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { logMessage } from '../src/helpers/log'
import { getOptimize, getOptions } from '../src/helpers/oxvg'
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
