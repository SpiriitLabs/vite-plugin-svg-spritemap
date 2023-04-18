import { describe, expect, it } from 'vitest'
import type { UserOptions } from '../src/types'
import { buildVite } from './helper/build'

const svgoConfigs: Record<string, UserOptions['svgo']> = {
  default: true,
  false: false,
  custom: {
    plugins: ['prefixIds'],
  },
}

describe('SVGO', () => {
  for (const key in svgoConfigs) {
    if (Object.prototype.hasOwnProperty.call(svgoConfigs, key)) {
      it(key, async () => {
        const svgo = svgoConfigs[key]
        const result = await buildVite({ svgo })
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
