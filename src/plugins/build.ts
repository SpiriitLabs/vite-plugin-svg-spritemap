import type { ExternalOption } from 'rollup'
import type { Plugin, ResolvedConfig } from 'vite'
import type { Shared } from '../types'
import { posix as path } from 'node:path'
import { getFileName } from '../helpers/filename'

export default function BuildPlugin(shared: Shared): Plugin {
  let fileRef: string
  let fileName: string
  let config: ResolvedConfig
  const pluginExternal = new RegExp(shared.options.route.url)
  const spritemapFilter = new RegExp(shared.options.route.url, 'g')

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
      /* v8 ignore if -- @preserve */
      if (!shared.svgManager)
        return

      await shared.svgManager.updateAll()

      if (typeof shared.options.output === 'object') {
        fileName = getFileName(
          shared.options.output.filename,
          'spritemap',
          shared.svgManager.spritemap,
          'svg',
        )
        const filePath = path.join(config.build.assetsDir, fileName)
        fileRef = this.emitFile({
          type: 'asset',
          needsCodeReference: false,
          name: shared.options.output.name,
          source: shared.svgManager.spritemap,
          fileName: filePath,
          originalFileName: shared.options.output.name,
        })
      }
    },
    transform: {
      filter: {
        code: spritemapFilter,
      },
      handler(code) {
        if (!code.match(spritemapFilter) || typeof shared.options.output !== 'object')
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
    },
  }
}
