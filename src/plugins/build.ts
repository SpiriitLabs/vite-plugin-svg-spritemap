import type { ExternalOption } from 'rollup'
import type { Plugin, ResolvedConfig } from 'vite'
import type { Options, Pattern } from '../types'
import { posix as path } from 'node:path'
import { getFileName } from '../helpers/filename'
import { SVGManager } from '../svgManager'

export default function BuildPlugin(iconsPattern: Pattern, options: Options): Plugin {
  let config: ResolvedConfig
  let fileRef: string
  let fileName: string
  let svgManager: SVGManager
  const spritemapFilter = new RegExp(`/${options?.route || '__spritemap'}`, 'g')
  const pluginExternal: ExternalOption = new RegExp(`/${options?.route || '__spritemap'}`)

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
          type: 'asset',
          needsCodeReference: false,
          name: options.output.name,
          source: svgManager.spritemap,
          fileName: filePath,
          originalFileName: options.output.name,
        })
      }
    },
    transform(code) {
      if (typeof options.output !== 'object' || !spritemapFilter.test(code))
        return

      // prevent sveltekit rewrite
      const base = config.base.startsWith('.')
        ? config.base.substring(1)
        : config.base

      return {
        code: code.replace(
          spritemapFilter,
          path.join(base, this.getFileName(fileRef)),
        ),
        map: null,
      }
    },
  }
}
