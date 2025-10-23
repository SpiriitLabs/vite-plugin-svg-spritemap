import type { UserOptions } from '../src/types'
import { describe, expect, it, vi } from 'vitest'
import { logMessage } from '../src/helpers/log'
import { buildVite } from './helper/build'

const svgoConfigs: Record<string, UserOptions['svgo']> = {
  default: true,
  false: false,
  custom: {
    plugins: ['prefixIds'],
  },
}

describe('svgo', () => {
  for (const key in svgoConfigs) {
    if (Object.prototype.hasOwnProperty.call(svgoConfigs, key)) {
      it(key, async () => {
        const svgo = svgoConfigs[key]
        const result = await buildVite({
          name: `svgo_${key}`,
          options: { svgo, oxvg: false },
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

  for (const key in svgoConfigs) {
    if (Object.prototype.hasOwnProperty.call(svgoConfigs, key)) {
      it(`${key} with warning`, async () => {
        const spy = vi.spyOn(console, 'warn')
        vi.doMock('svgo', async () => {})

        const svgo = svgoConfigs[key]
        const result = await buildVite({
          name: `svgo_warning`,
          options: { svgo, oxvg: false },
        })
        const warningStr = logMessage('You need to install SVGO to be able to optimize your SVG with it.')

        const call = spy.mock.lastCall
        if (svgo === false) {
          expect(call).not.toStrictEqual([warningStr])
        }
        else {
          expect(call).toStrictEqual([warningStr])
        }

        spy.mockClear()
        vi.doUnmock('svgo')

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
