import type { Plugin } from 'vite'
import type { HMRUpdate } from '@/events'
import type { Options, Shared } from '@/types'
import { relative } from 'node:path'
import picomatch from 'picomatch'
import { generateHMR } from '@/core/hmr'
import { iconIds } from '@/helpers/icons'
import { collectRouteNames, createSpritemapModuleData, createSpritemapModuleIds, createSpritemapModuleSource, parseVirtualSpritemapId, spritemapModuleKind, unknownVirtualSpritemapError, virtualSpritemapFilter, virtualSpritemapIds } from '@/helpers/routeModule'
import { createRouteFilterRegExp, createRouteModuleRegExp, createRouteRegExp } from '@/helpers/routeRegExp'
import { parseSvgQuery } from '@/helpers/svgQuery'

const filterSVG = /\.svg$/
// `?import`, `?t=…`, `#sprite-x`: never part of the route
const filterQuery = /[?#].*$/
// The cache-busting suffix appended to the route in dev
const filterRouteHash = /^__[\w-]+$/
const filterBodyClose = /<\/body\s*>/i

export default function DevPlugin(shared: Shared): Plugin {
  let routeNames: string[] = []
  const virtualModuleId = '/@vite-plugin-svg-spritemap/client'
  const event = 'vite-plugin-svg-spritemap:update'
  // Vue's `transformAssetUrls` turns a route reference into an import (#54)
  const routeModuleFilter = createRouteModuleRegExp(shared.options.route.url)
  // One module per shape a user can ask for; a raw route reference resolves to
  // `moduleIds.url`, the one `?url` asks for, so that spelling still collapses
  // onto a single id (#135)
  const moduleIds = createSpritemapModuleIds(shared.options.route.url)
  // Match any module (CSS, JS, compiled Vue/JSX templates, …) that references
  // the raw route so user-authored `/__spritemap#…` usages are rewritten to
  // the base-aware url in dev, not just stylesheet `url()` declarations.
  const routeFilter = createRouteFilterRegExp(shared.options.route.url)

  /**
   * Whether a request url targets the route or its `__<hash>` variant
   */
  function isSpritemapRequest(url: string): boolean {
    const pathname = url.replace(filterQuery, '')
    if (!pathname.startsWith(shared.routeUrlBase))
      return false

    const suffix = pathname.slice(shared.routeUrlBase.length)
    return suffix === '' || filterRouteHash.test(suffix)
  }

  /**
   * Vite strips `config.base` before resolving an import, but a consumer that
   * resolves ids itself (vite-node, which Nuxt renders through) does not (#138)
   */
  function withoutBase(id: string): string {
    const { routeUrl, routeUrlBase } = shared
    return routeUrlBase !== routeUrl && id.startsWith(routeUrlBase)
      ? routeUrl + id.slice(routeUrlBase.length)
      : id
  }

  return <Plugin>{
    name: 'vite-plugin-svg-spritemap:dev',
    apply: 'serve',
    config() {
      // The dep scanner resolves a dependency's imports through esbuild rather
      // than the plugin container, so a package importing the id would be
      // reported missing. `exclude` is read before that resolver runs (#135)
      return {
        optimizeDeps: {
          // Only the ids this instance answers, and only the query-less
          // spellings: `?url` / `?raw` are in Vite's own SPECIAL_QUERY_RE
          exclude: virtualSpritemapIds(shared.options.route.name),
        },
      }
    },
    configResolved(config) {
      routeNames = collectRouteNames(config.plugins, shared.options.route.name)
    },
    resolveId: {
      // `routeUrlBase` is only known at `configResolved`, after this filter is
      // built: gate loosely here, match exactly in the handler
      filter: {
        id: [virtualModuleId, virtualSpritemapFilter, routeFilter],
      },
      handler(id) {
        if (id === virtualModuleId)
          return id

        const virtual = parseVirtualSpritemapId(id)
        if (virtual) {
          if (virtual.name === shared.options.route.name)
            return moduleIds[virtual.kind]

          // Another instance owns it; every instance reaches the same verdict,
          // so whichever is asked first reports it once
          if (!routeNames.includes(virtual.name))
            this.error(unknownVirtualSpritemapError(id, routeNames))

          return
        }

        if (routeModuleFilter.test(withoutBase(id)))
          return moduleIds.url
      },
    },
    load: {
      filter: {
        id: [virtualModuleId, moduleIds.object, moduleIds.url, moduleIds.raw],
      },
      handler(id) {
        /* v8 ignore if -- @preserve */
        if (!shared.svgManager)
          return

        const svgManager = shared.svgManager
        const kind = spritemapModuleKind(moduleIds, id)
        if (kind) {
          return createSpritemapModuleSource(kind, createSpritemapModuleData(
            svgManager,
            shared.options,
            // Recomputed per load, so a stale importer still gets a served url
            () => `${shared.routeUrlBase}__${svgManager.hash}`,
          ))
        }

        /* v8 ignore else -- @preserve */
        if (id === virtualModuleId) {
          const optionsWithBase = {
            ...shared.options,
            route: { ...shared.options.route, url: shared.routeUrlBase },
          } satisfies Options
          return generateHMR(event, svgManager.spritemap, optionsWithBase)
        }
      },
    },
    async buildStart() {
      await shared.svgManager?.updateAll()
      shared.svgManager?.directories.forEach(directory => this.addWatchFile(directory))
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // req.url is always set on server requests
        /* v8 ignore next 2 -- @preserve */
        if (req.method !== 'GET' || !isSpritemapRequest(req.url || ''))
          return next()

        /* v8 ignore if -- @preserve */
        if (!shared.svgManager)
          return next()

        res.statusCode = 200
        res.setHeader('Content-Type', 'image/svg+xml')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.write(shared.svgManager.spritemap, 'utf-8')
        res.end()
      })
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        /* v8 ignore if -- @preserve */
        if (!shared.svgManager)
          return html

        // Keep the raw, root-relative route here: Vite's own HTML processing
        // injects `config.base` into root-relative URLs, so prefixing it
        // ourselves would double the base. A leading `./` is swallowed so a
        // relative reference becomes root-relative and still gets the base.
        html = html.replace(
          createRouteRegExp(shared.routeUrl),
          `${shared.routeUrl}__${shared.svgManager.hash}`,
        )

        if (!html.includes(`src="${virtualModuleId}"`)) {
          const script = `<script type="module" src="${virtualModuleId}"></script>`
          // End tags are case-insensitive and may hold whitespace before `>`.
          // An entry that is a fragment has no body tag to sit in front of.
          html = filterBodyClose.test(html)
            ? html.replace(filterBodyClose, match => script + match)
            : html + script
        }

        return html
      },
    },
    async hotUpdate({ file, type }) {
      /* v8 ignore if -- @preserve */
      if (!shared.svgManager)
        return

      if (!filterSVG.test(file))
        return
      const relativePath = relative(this.environment.config.root, file)
      const absolutePath = file

      const matchOptions = { windows: true }
      if (!picomatch.isMatch(relativePath, shared.svgManager.iconsPattern, matchOptions) && !picomatch.isMatch(absolutePath, shared.svgManager.iconsPattern, matchOptions))
        return

      // `idify` reads the icon's content, so even a content edit can rename an
      // id: the set has to be compared, not inferred from the event type
      const iconsBefore = iconIds(shared.svgManager.svgs)

      if (type === 'delete' && shared.svgManager.has(file)) {
        await shared.svgManager.delete(file)
      }
      else if (
        (type === 'create' && !shared.svgManager.has(file))
        || (type === 'update' && shared.svgManager.has(file))
      ) {
        await shared.svgManager.update(file, type)
      }
      else {
        return
      }

      this.environment.hot.send({
        type: 'custom',
        event,
        data: {
          route: { ...shared.options.route, url: shared.routeUrlBase },
          id: shared.svgManager.hash,
          spritemap: shared.options?.injectSvgOnDev ? shared.svgManager.spritemap : '',
        } satisfies HMRUpdate,
      })

      // The client above only rewrites urls already in the DOM, so it cannot fix
      // stale markup: the raw module always goes. The object module only goes
      // when the icon set changed, since its other field, the url, is answered
      // by the middleware whatever the hash it carries — the same reason the url
      // module is never invalidated. Neither module is accepted by an importer,
      // so returning one full-reloads the page, and an icon edit is meant to
      // patch in place (#135)
      const iconsAfter = iconIds(shared.svgManager.svgs)
      const iconsChanged = iconsBefore.length !== iconsAfter.length
        || iconsBefore.some((id, index) => id !== iconsAfter[index])

      const stale = [...(iconsChanged ? [moduleIds.object] : []), moduleIds.raw]
        .map(id => this.environment.moduleGraph.getModuleById(id))
        .filter(module => typeof module !== 'undefined')

      stale.forEach(module => this.environment.moduleGraph.invalidateModule(module))

      return stale
    },
    transform: {
      filter: {
        code: routeFilter,
      },
      handler(code, id) {
        /* v8 ignore if -- @preserve */
        if (!shared.svgManager)
          return

        // The Vue plugin already bakes `config.base` and the cache-busting hash
        // into `?use` / `?view` output, so rewriting it here would double them.
        if (parseSvgQuery(id))
          return

        return {
          code: code.replace(
            createRouteRegExp(shared.routeUrl),
            `${shared.routeUrlBase}__${shared.svgManager.hash}`,
          ),
          map: null,
        }
      },
    },
  }
}
