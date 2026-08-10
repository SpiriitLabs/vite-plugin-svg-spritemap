import type { ExternalOption } from 'rollup'
import type { Plugin, ResolvedConfig } from 'vite'
import type { Shared } from '@/types'
import { posix as path } from 'node:path'
import { getFileName } from '@helpers/filename'
import { createRouteFilterRegExp, createRouteImportRegExp, createRouteRegExp } from '@helpers/routeRegExp'

export default function BuildPlugin(shared: Shared): Plugin {
  let fileRef: string
  let fileName: string
  let config: ResolvedConfig
  const pluginExternal = createRouteImportRegExp(shared.options.route.url)
  const spritemapFilter = createRouteFilterRegExp(shared.options.route.url)

  return <Plugin>{
    name: 'vite-plugin-svg-spritemap:build',
    apply: 'build',
    config(config) {
      const configExternal = config.build?.rollupOptions?.external
      let finalExternal: ExternalOption = pluginExternal

      if (Array.isArray(configExternal)) {
        finalExternal = [...configExternal, pluginExternal]
      }
      else if (typeof configExternal === 'string' || typeof configExternal === 'object') {
        finalExternal = [configExternal, pluginExternal]
      }
      else if (typeof configExternal === 'function') {
        finalExternal = (source, importer, isResolved) => {
          if (pluginExternal.test(source))
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
          // Derive the `[name]` token from `output.name` (`.svg` stripped)
          // so `output.name` controls the emitted filename. Defaults to
          // `spritemap` (from the default `output.name` of `spritemap.svg`).
          path.basename(shared.options.output.name, '.svg'),
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
        if (!spritemapFilter.test(code) || typeof shared.options.output !== 'object')
          return

        // prevent sveltekit rewrite
        const isRelativeBase = config.base.startsWith('.')
        const base = isRelativeBase
          ? config.base.substring(1)
          : config.base

        return {
          code: code.replace(
            // For an absolute base, swallow a leading `./` so a relative
            // `./__spritemap` reference doesn't double the base
            // (`./example/…`). For a relative base keep the dot so the emitted
            // path stays relative (`./assets/…`).
            createRouteRegExp(shared.options.route.url, { dot: !isRelativeBase, numbered: false }),
            path.join(base, this.getFileName(fileRef)),
          ),
          map: null,
        }
      },
    },
  }
}
