import type { Plugin, ResolvedConfig } from 'vite'
import type { Options, Pattern } from '../types'
import { generateSpritemap } from '../spritemap'
import { join } from 'path'
import { getFileName } from '../helpers/filename'

export function BuildPlugin(iconsPattern: Pattern, options: Options): Plugin {
  let spritemap: string | false = false
  let config: ResolvedConfig
  let fileName: string
  let filePath: string

  return <Plugin>{
    name: 'vite-plugin-svg-spritemap:build',
    apply: 'build',
    configResolved(_config) {
      config = _config
    },
    async buildStart() {
      spritemap = await generateSpritemap(iconsPattern, options)
      if (typeof options.output === 'object') {
        fileName = getFileName(
          options.output.filename,
          'spritemap',
          spritemap,
          'svg'
        )
        filePath = join(config.build.assetsDir, fileName)
      }
    },
    transformIndexHtml: {
      enforce: 'post',
      transform(html) {
        return html.replace(/__spritemap/g, filePath)
      }
    },
    generateBundle(_, bundle) {
      if (typeof options.output === 'object' && spritemap) {
        bundle[fileName] = {
          isAsset: true,
          name: fileName,
          source: spritemap,
          type: 'asset',
          fileName: filePath
        }
      }
    }
  }
}
