import type { UserOptions } from '../src/types'
import { describe, expect, it } from 'vitest'
import { buildVite } from './helper/build'

const prefixConfigs: Record<string, UserOptions['prefix']> = {
  prefix: undefined,
  custom: 'icon-',
  false: false,
}

describe('prefix', () => {
  for (const key in prefixConfigs) {
    if (Object.prototype.hasOwnProperty.call(prefixConfigs, key)) {
      it(key, async () => {
        const prefix = prefixConfigs[key]
        const result = await buildVite({ name: `prefix_${key}`, options: { prefix } })
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
