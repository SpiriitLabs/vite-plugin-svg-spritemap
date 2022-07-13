import type { Plugin, ResolvedConfig } from 'vite'
import type { Options, Pattern } from '../types'
import { join } from 'path'
import { getFileName } from '../helpers/filename'
import { SVGManager } from '../svgManager'
import { resolve } from 'path'

export function BuildPlugin(iconsPattern: Pattern, options: Options): Plugin {
  let config: ResolvedConfig
  let fileName: string
  let filePath: string
  let svgManager: SVGManager

  return <Plugin>{
    name: 'vite-plugin-svg-spritemap:build',
    apply: 'build',
    configResolved(_config) {
      config = _config
      svgManager = new SVGManager(iconsPattern, options, config)
    },
    async buildStart() {
      await svgManager.updateAll()

      if (typeof options.output === 'object') {
        fileName = getFileName(
          options.output.filename,
          'spritemap',
          svgManager.spritemap,
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
      if (typeof options.output === 'object') {
        bundle[fileName] = {
          isAsset: true,
          name: fileName,
          source: svgManager.spritemap,
          type: 'asset',
          fileName: filePath
        }
      }
    }
  }
}
