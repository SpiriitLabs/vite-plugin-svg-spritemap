import type { ExternalOption, PluginContext } from 'rollup'
import type { Plugin, ResolvedConfig } from 'vite'
import type { Shared } from '@/types'
import { posix as path } from 'node:path'
import { getFileName } from '@helpers/filename'
import { collectRouteNames, createSpritemapModuleData, createSpritemapModuleIds, createSpritemapModuleSource, parseVirtualSpritemapId, spritemapModuleKind, unknownVirtualSpritemapError, VIRTUAL_SPRITEMAP } from '@helpers/routeModule'
import { createRouteFilterRegExp, createRouteImportRegExp, createRouteRegExp } from '@helpers/routeRegExp'

export default function BuildPlugin(shared: Shared): Plugin {
  let fileRef: string
  let fileName: string
  let config: ResolvedConfig
  let routeNames: string[] = []
  // Also read by Vite for a css `url()` reference, which is not an import and so
  // never reaches `resolveId` (#30)
  const pluginExternal = createRouteImportRegExp(shared.options.route.url)
  const spritemapFilter = createRouteFilterRegExp(shared.options.route.url)
  // One module per shape a user can ask for; a raw route reference resolves to
  // `moduleIds.url`, the one `?url` asks for, so that spelling still collapses
  // onto a single id (#135)
  const moduleIds = createSpritemapModuleIds(shared.options.route.url)

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
      routeNames = collectRouteNames(_config.plugins, shared.options.route.name)
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
      const virtual = parseVirtualSpritemapId(source)
      if (virtual) {
        if (virtual.name !== shared.options.route.name) {
          // Another instance owns it; every instance reaches the same verdict,
          // so whichever is asked first reports it once
          if (!routeNames.includes(virtual.name))
            this.error(unknownVirtualSpritemapError(source, routeNames))

          return
        }

        // `?raw` inlines the markup, so it needs no emitted file to point at —
        // and `output: false` is how you ask for the sprite only once
        if (virtual.kind === 'raw' || (typeof shared.options.output === 'object' && fileRef))
          return moduleIds[virtual.kind]

        // Unlike a route reference, which stays external and resolves against
        // whatever serves it, there is no url to fall back to here (#135)
        this.error(`Cannot resolve "${source}" because the \`output\` option is false: no spritemap file is emitted to point it at. Import "${VIRTUAL_SPRITEMAP}/${virtual.name}?raw" for the markup instead.`)
      }

      // `output: false` emits nothing to point an import at
      if (typeof shared.options.output !== 'object' || !fileRef)
        return

      // Vue's `transformAssetUrls` turns a route reference into an import (#54).
      // `resolveId` only sees the emitted path, `transform` having rewritten the
      // specifier, and a relative base keeps the reference's leading dot
      const url = emittedUrl(this)
      if (source === url || source === `.${url}`)
        return moduleIds.url
    },
    load: {
      filter: {
        id: [moduleIds.object, moduleIds.url, moduleIds.raw],
      },
      handler(id) {
        /* v8 ignore if -- @preserve */
        if (!shared.svgManager)
          return

        const svgManager = shared.svgManager
        const kind = spritemapModuleKind(moduleIds, id)

        /* v8 ignore if -- @preserve */
        if (!kind)
          return

        return createSpritemapModuleSource(kind, createSpritemapModuleData(
          svgManager,
          shared.options,
          // Called only by the kinds that read a url: with `output: false` there
          // is no emitted file for `emittedUrl` to name, and `raw` needs none.
          // A relative base keeps the leading dot, as a route reference does
          () => {
            const emitted = emittedUrl(this)
            return isRelativeBase() ? `.${emitted}` : emitted
          },
        ))
      },
    },
  }
}
