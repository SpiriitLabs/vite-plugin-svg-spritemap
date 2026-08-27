import type { ExternalOption, PluginContext } from 'rollup'
import type { Plugin, ResolvedConfig } from 'vite'
import type { Shared } from '@/types'
import { posix as path } from 'node:path'
import { getFileName } from '@helpers/filename'
import { createRouteModule, createRouteModuleId } from '@helpers/routeModule'
import { createRouteFilterRegExp, createRouteImportRegExp, createRouteRegExp } from '@helpers/routeRegExp'

export default function BuildPlugin(shared: Shared): Plugin {
  let fileRef: string
  let fileName: string
  let config: ResolvedConfig
  // Also read by Vite for a css `url()` reference, which is not an import and so
  // never reaches `resolveId` (#30)
  const pluginExternal = createRouteImportRegExp(shared.options.route.url)
  const spritemapFilter = createRouteFilterRegExp(shared.options.route.url)
  // Vue's `transformAssetUrls` turns a route reference into an import (#54).
  // `resolveId` only sees the emitted path, `transform` having rewritten the
  // specifier
  const routeModuleId = createRouteModuleId(shared.options.route.url)

  function isRelativeBase(): boolean {
    return config.base.startsWith('.')
  }

  /** Url of the emitted spritemap, what a route reference is rewritten to */
  function emittedUrl(context: PluginContext): string {
    // prevent sveltekit rewrite
    const base = isRelativeBase()
      ? config.base.substring(1)
      : config.base

    return path.join(base, context.getFileName(fileRef))
  }

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
      shared.svgManager.directories.forEach(directory => this.addWatchFile(directory))

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

        return {
          code: code.replace(
            // For an absolute base, swallow a leading `./` so a relative
            // `./__spritemap` reference doesn't double the base
            // (`./example/…`). For a relative base keep the dot so the emitted
            // path stays relative (`./assets/…`).
            createRouteRegExp(shared.options.route.url, { dot: !isRelativeBase(), numbered: false }),
            emittedUrl(this),
          ),
          map: null,
        }
      },
    },
    resolveId(source) {
      // `output: false` emits nothing to point an import at
      if (typeof shared.options.output !== 'object' || !fileRef)
        return

      // A relative base keeps the reference's leading dot
      const url = emittedUrl(this)
      if (source === url || source === `.${url}`)
        return routeModuleId
    },
    load: {
      filter: {
        id: routeModuleId,
      },
      handler(id) {
        /* v8 ignore else -- @preserve */
        if (id === routeModuleId) {
          const url = emittedUrl(this)
          return createRouteModule(isRelativeBase() ? `.${url}` : url)
        }
      },
    },
  }
}
