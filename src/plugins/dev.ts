import type { Plugin } from 'vite'
import type { HMRUpdate } from '@/events'
import type { Options, Shared } from '@/types'
import { relative } from 'node:path'
import picomatch from 'picomatch'
import { generateHMR } from '@/core/hmr'
import { createRouteFilterRegExp, createRouteRegExp } from '@/helpers/routeRegExp'
import { parseSvgQuery } from '@/helpers/svgQuery'

const filterSVG = /\.svg$/
// `?import`, `?t=…`, `#sprite-x`: never part of the route
const filterQuery = /[?#].*$/
// The cache-busting suffix appended to the route in dev
const filterRouteHash = /^__[\w-]+$/

export default function DevPlugin(shared: Shared): Plugin {
  const virtualModuleId = '/@vite-plugin-svg-spritemap/client'
  const event = 'vite-plugin-svg-spritemap:update'
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

  return <Plugin>{
    name: 'vite-plugin-svg-spritemap:dev',
    apply: 'serve',
    resolveId: {
      filter: {
        id: virtualModuleId,
      },
      handler(id) {
        if (id === virtualModuleId)
          return id
      },
    },
    load: {
      filter: {
        id: virtualModuleId,
      },
      handler(id) {
        if (shared.svgManager && id === virtualModuleId) {
          const optionsWithBase = {
            ...shared.options,
            route: { ...shared.options.route, url: shared.routeUrlBase },
          } satisfies Options
          return generateHMR(event, shared.svgManager.spritemap, optionsWithBase)
        }
      },
    },
    async buildStart() {
      await shared.svgManager?.updateAll()
      shared.svgManager?.directories.forEach(directory => this.addWatchFile(directory))
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
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
          html = html.replace(
            '</body>',
            `<script type="module" src="${virtualModuleId}"></script></body>`,
          )
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

      return []
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
