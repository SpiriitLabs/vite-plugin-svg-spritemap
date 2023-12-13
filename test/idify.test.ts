import { describe, expect, it } from 'vitest'
import type { UserOptions } from '../src/types'
import { buildVite } from './helper/build'

const idifyConfigs: Record<string, UserOptions['idify']> = {
  default: undefined,
  custom: name => `prefix-${name}`,
}

describe('idefy', () => {
  for (const key in idifyConfigs) {
    if (Object.prototype.hasOwnProperty.call(idifyConfigs, key)) {
      it(key, async () => {
        const idify = idifyConfigs[key]
        const result = await buildVite({ idify })
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
