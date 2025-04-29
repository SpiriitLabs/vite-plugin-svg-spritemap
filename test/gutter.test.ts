import type { UserOptions } from '../src/types'
import { describe, expect, it } from 'vitest'
import { buildVite } from './helper/build'

const gutterConfigs: Record<string, UserOptions['gutter']> = {
  base: undefined,
  custom: 20,
}

describe('gutter', () => {
  for (const key in gutterConfigs) {
    if (Object.prototype.hasOwnProperty.call(gutterConfigs, key)) {
      it(key, async () => {
        const gutter = gutterConfigs[key]
        const result = await buildVite({ name: `gutter_${key}`, options: { gutter } })
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
