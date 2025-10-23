import type { UserOptions } from '../src/types'
import { describe, expect, it, vi } from 'vitest'
import { logMessage } from '../src/helpers/log'
import { buildVite } from './helper/build'

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

describe('oxvg', () => {
  for (const key in oxvgConfigs) {
    if (Object.prototype.hasOwnProperty.call(oxvgConfigs, key)) {
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
    if (Object.prototype.hasOwnProperty.call(oxvgConfigs, key)) {
      it(`${key} with warning`, async () => {
        const spy = vi.spyOn(console, 'warn')
        vi.doMock('@oxvg/napi', async () => {})

        const oxvg = oxvgConfigs[key]
        const result = await buildVite({
          name: `oxvg_warning`,
          options: { oxvg, svgo: false },
        })
        const warningStr = logMessage('You need to install OXVG to be able to optimize your SVG with it.')

        const call = spy.mock.lastCall
        if (oxvg === false) {
          expect(call).not.toStrictEqual([warningStr])
        }
        else {
          expect(call).toStrictEqual([warningStr])
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
})
