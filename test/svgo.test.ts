import type { UserOptions } from '../src/types'
import { describe, expect, it, vi } from 'vitest'
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
          options: { svgo },
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
          options: { svgo },
        })
        const warningStr = '[vite-plugin-svg-spritemap] You need to install SVGO to be able to optimize your SVG with it.'

        for (const call of spy.mock.calls) {
          if (svgo === false) {
            expect(call).not.toStrictEqual([warningStr])
          }
          else {
            expect(call).toStrictEqual([warningStr])
          }
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
