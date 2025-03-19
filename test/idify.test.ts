import type { UserOptions } from '../src/types'
import { describe, expect, it } from 'vitest'
import { buildVite } from './helper/build'

const idifyConfigs: Record<string, UserOptions['idify']> = {
  custom: name => `custom-${name}`,
}

describe('idify', () => {
  for (const key in idifyConfigs) {
    if (Object.prototype.hasOwnProperty.call(idifyConfigs, key)) {
      it.concurrent(key, async () => {
        const idify = idifyConfigs[key]
        const result = await buildVite({ name: `idify_${key}`, options: { idify } })
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
