import { describe, expect, it } from 'vitest'
import type { UserOptions } from '../src/types'
import { buildVite } from './helper/build'

const outputConfigs: Record<string, UserOptions['output']> = {
  default: true,
  false: false,
  string: 'spritemap.[hash][extname]',
  object_with_default: {
    filename: 'spritemap.[hash][extname]',
    use: true,
    view: true,
  },
  object_with_only_view: {
    filename: 'spritemap.[hash][extname]',
    view: true,
    use: false,
  },
  object_with_only_use: {
    filename: 'spritemap.[hash][extname]',
    use: true,
    view: false,
  },
  object_with_only_symbol: {
    filename: 'spritemap.[hash][extname]',
    use: false,
    view: false,
  },
}

const outputManifestConfigs: Record<string, UserOptions['output']> = {
  default: {
    filename: 'spritemap.[hash][extname]',
    use: true,
    view: true,
  },
  custom: {
    filename: 'spritemap.[hash][extname]',
    use: true,
    view: true,
    name: 'icons.svg',
  },
}

describe('output generation', () => {
  for (const key in outputConfigs) {
    if (Object.prototype.hasOwnProperty.call(outputConfigs, key)) {
      it.concurrent(key, async () => {
        const output = outputConfigs[key]
        const result = await buildVite({ name: `output_${key}`, options: { output } })
        const asset = 'output' in result
          ? result.output.find(
            asset =>
              asset.name?.startsWith('spritemap.') && asset.name.endsWith('.svg'),
          )
          : undefined

        expect(asset)[output === false ? 'toBeUndefined' : 'toBeDefined']()

        if (asset && 'source' in asset) {
          const source = asset.source.toString()
          const check = {
            use:
              (typeof output === 'object' && typeof output.use !== 'undefined')
                ? output.use
                : true,
            view:
              (typeof output === 'object' && typeof output.view !== 'undefined')
                ? output.view
                : true,
          }

          if (check.use) {
            expect(
              /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink">/.test(
                source,
              ),
            ).toBeTruthy()
          }
          else {
            expect(
              /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg">/.test(source),
            ).toBeTruthy()
          }

          expect(
            /<symbol .* id=".*" [^\n\r>\u2028\u2029]*>.*<\/symbol>/.test(source),
          ).toBeTruthy()

          if (check.use)
            expect(/<use .* xlink:href="#.*" .*\/>/.test(source)).toBeTruthy()

          if (check.view)
            expect(/<view .* id=".*" .*\/>/.test(source)).toBeTruthy()
        }
      })
    }
  }
})

it('empty output generation', async () => {
  const result = await buildVite({ name: 'output_empty', path: './project/svg_empty/*.svg' })
  const asset = 'output' in result
    ? result.output.find(
      asset => asset.name?.startsWith('spritemap.') && asset.name.endsWith('.svg'),
    )
    : undefined

  expect(asset).toBeDefined()

  if (asset && 'source' in asset) {
    expect(asset.source).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"/>',
    )
  }
})

describe('output manifest generation', () => {
  for (const key in outputManifestConfigs) {
    if (Object.prototype.hasOwnProperty.call(outputManifestConfigs, key)) {
      it.concurrent(key, async () => {
        const output = outputManifestConfigs[key]
        const manifestKey = (typeof output === 'object' ? output.name : null) || 'spritemap.svg'
        const result = await buildVite({
          name: `output_manifest_${key}`,
          options: {
            output,
          },
          viteConfig: {
            build: {
              manifest: true,
            },
          },
        })

        const manifestBundle = 'output' in result
          ? result.output.find(
            asset => asset.fileName.endsWith('manifest.json'),
          )
          : undefined

        expect(manifestBundle).toBeDefined()

        if (!manifestBundle || !('source' in manifestBundle && typeof manifestBundle.source === 'string'))
          return

        const manifest = JSON.parse(manifestBundle.source)
        expect(manifest[manifestKey]).toBeDefined()
      })
    }
  }
})
