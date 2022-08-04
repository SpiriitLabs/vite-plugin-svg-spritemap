import { it, describe, expect } from 'vitest'
import type { UserOptions } from '../src/types'
import { buildVite } from './helper/build'

const outputConfigs: Record<string, UserOptions['output']> = {
  default: true,
  false: false,
  string: 'spritemap.[hash][extname]',
  'object with default': {
    filename: 'spritemap.[hash][extname]',
    use: true,
    view: true
  },
  'object with only view': {
    filename: 'spritemap.[hash][extname]',
    view: true,
    use: false
  },
  'object with only use': {
    filename: 'spritemap.[hash][extname]',
    use: true,
    view: false
  },
  'object with only symbol': {
    filename: 'spritemap.[hash][extname]',
    use: false,
    view: false
  }
}

describe('Output generation', () => {
  for (const key in outputConfigs) {
    if (Object.prototype.hasOwnProperty.call(outputConfigs, key)) {
      it(key, async () => {
        const output = outputConfigs[key]
        const result = await buildVite({ output })
        const asset = result.output.find(
          asset =>
            asset.name?.startsWith('spritemap.') && asset.name.endsWith('.svg')
        )

        expect(asset)[output === false ? 'toBeUndefined' : 'toBeDefined']()

        if (asset && 'source' in asset) {
          const source = asset.source.toString()
          const check = {
            use:
              typeof output === 'object' && typeof output.use !== 'undefined'
                ? output.use
                : true,
            view:
              typeof output === 'object' && typeof output.view !== 'undefined'
                ? output.view
                : true
          }

          if (check.use) {
            expect(
              /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink">/gm.test(
                source
              )
            ).toBeTruthy()
          } else {
            expect(
              /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg">/gm.test(source)
            ).toBeTruthy()
          }

          expect(
            /<symbol .* id=".*" .*>.*<\/symbol>/gm.test(source)
          ).toBeTruthy()

          if (check.use) {
            expect(/<use .* xlink:href="#.*" .*\/>/gm.test(source)).toBeTruthy()
          }

          if (check.view) {
            expect(/<view .* id=".*" .*\/>/gm.test(source)).toBeTruthy()
          }
        }
      })
    }
  }
})
