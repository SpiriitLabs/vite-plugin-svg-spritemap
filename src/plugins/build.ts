import path from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import type { Options, Pattern } from '../types'
import { SVGManager } from '../svgManager'
import { getFileName } from '../helpers/filename'

export default function BuildPlugin(iconsPattern: Pattern, options: Options): Plugin {
  let config: ResolvedConfig
  let fileRef: string
  let fileName: string
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
          'svg',
        )
        const filePath = path.join(config.build.assetsDir, fileName)
        fileRef = this.emitFile({
          needsCodeReference: false,
          name: options.output.name,
          source: svgManager.spritemap,
          type: 'asset',
          fileName: filePath,
        })
      }
    },
    transform(code) {
      if (typeof options.output === 'object') {
        return {
          code: code.replace(/\/__spritemap/g, path.join(config.base, this.getFileName(fileRef))),
          map: null,
        }
      }
    },
  }
}
