import path from 'node:path'
import type { ExternalOption } from 'rollup'
import type { Plugin, ResolvedConfig } from 'vite'
import type { Options, Pattern } from '../types'
import { SVGManager } from '../svgManager'
import { getFileName } from '../helpers/filename'

export default function BuildPlugin(iconsPattern: Pattern, options: Options): Plugin {
  let config: ResolvedConfig
  let fileRef: string
  let fileName: string
  let svgManager: SVGManager
  const pluginExternal: ExternalOption = /\/__spritemap/

  return <Plugin>{
    name: 'vite-plugin-svg-spritemap:build',
    apply: 'build',
    config(config) {
      const configExternal = config.build?.rollupOptions?.external
      let finalExternal: ExternalOption = pluginExternal

      if (Array.isArray(configExternal)) {
        configExternal.push(pluginExternal)
        finalExternal = configExternal
      }
      else if (typeof configExternal === 'string' || typeof configExternal === 'object') {
        finalExternal = [configExternal, pluginExternal]
      }
      else if (typeof configExternal === 'function') {
        finalExternal = (source, importer, isResolved) => {
          if (source.match(pluginExternal))
            return true

          const res = configExternal(source, importer, isResolved)
          return res
        }
      }

      return {
        build: {
          rollupOptions: {
            external: finalExternal,
          },
        },
      }
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
