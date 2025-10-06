import type { ExternalOption } from 'rollup'
import type { Plugin, ResolvedConfig } from 'vite'
import type { SVGManager } from '../svgManager'
import type { Options } from '../types'
import { posix as path } from 'node:path'
import { getFileName } from '../helpers/filename'

export default function BuildPlugin(shared: { svgManager: SVGManager | null }, options: Options): Plugin {
  let fileRef: string
  let fileName: string
  const spritemapFilter = new RegExp(`/${options?.route || '__spritemap'}`, 'g')
  const pluginExternal: ExternalOption = new RegExp(`/${options?.route || '__spritemap'}`)
  let config: ResolvedConfig

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
    },
    async buildStart() {
      if (!shared.svgManager)
        return

      await shared.svgManager.updateAll()

      if (typeof options.output === 'object') {
        fileName = getFileName(
          options.output.filename,
          'spritemap',
          shared.svgManager.spritemap,
          'svg',
        )
        const filePath = path.join(config.build.assetsDir, fileName)
        fileRef = this.emitFile({
          type: 'asset',
          needsCodeReference: false,
          name: options.output.name,
          source: shared.svgManager.spritemap,
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
