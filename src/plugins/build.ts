import path from 'node:path'
import type { ExternalOption } from 'rollup'
import type { Plugin, ResolvedConfig, UserConfig } from 'vite'
import { mergeConfig } from 'vite'
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
    config(config) {
      const configExternal = config.build?.rollupOptions?.external
      let pluginExternal: ExternalOption = /\/__spritemap/

      if (Array.isArray(configExternal)) {
        configExternal.push(pluginExternal)
        pluginExternal = configExternal
      }
      else if (typeof configExternal === 'string' || typeof configExternal === 'object') {
        pluginExternal = [configExternal, pluginExternal]
      }
      else if (typeof configExternal === 'function') {
        pluginExternal = (source, importer, isResolved) => {
          if (source.match(/\/__spritemap/))
            return true

          const res = configExternal(source, importer, isResolved)
          return res
        }
      }

      const pluginConfig: UserConfig = {
        build: {
          rollupOptions: {
            external: pluginExternal,
          },
        },
      }

      return mergeConfig(config, pluginConfig)
    },
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
