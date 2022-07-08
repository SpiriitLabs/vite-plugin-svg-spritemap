import type { AdvancedOptions, Pattern } from '../types'
import type { Plugin, ResolvedConfig } from 'vite'
import { generateSpritemap } from '../generateSpritemap'
import { join } from 'path'
import hash_sum from 'hash-sum'

export function BuildPlugin(iconsPattern: Pattern, options?: AdvancedOptions) {
  let spritemap: string | false = false
  let config: ResolvedConfig
  let fileName: string

  return <Plugin>{
    name: 'vite-plugin-svg-spritemap:build',
    apply: 'build',
    enforce: 'post',
    configResolved(_config) {
      config = _config
    },
    async load() {
      spritemap = await generateSpritemap(iconsPattern)
      fileName = `spritemap.${hash_sum(spritemap)}.svg`
    },
    transformIndexHtml: {
      enforce: 'post',
      transform(html) {
        return html.replace(
          /__spritemap/g,
          join(config.build.assetsDir, fileName)
        )
      }
    },
    generateBundle(_, bundle) {
      if (spritemap) {
        bundle[fileName] = {
          isAsset: true,
          name: fileName,
          source: spritemap,
          type: 'asset',
          fileName: join(config.build.assetsDir, fileName)
        }
      }
    }
  }
}
