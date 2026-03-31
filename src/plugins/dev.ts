import type { Plugin } from 'vite'
import type { HMRUpdate } from '@/events'
import type { Options, Shared } from '@/types'
import { relative } from 'node:path'
import picomatch from 'picomatch'
import { generateHMR } from '@/core/hmr'
import { escapeRegExp } from '@/helpers/escapeRegExp'

const filterSVG = /\.svg$/
const filterCSS = /\.(s?css|styl|less)$/

export default function DevPlugin(shared: Shared): Plugin {
  const virtualModuleId = '/@vite-plugin-svg-spritemap/client'
  const event = 'vite-plugin-svg-spritemap:update'

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
            route: { ...shared.options.route, url: shared.routeUrl },
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
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (url.startsWith(shared.routeUrl)) {
          /* v8 ignore if -- @preserve */
          if (!shared.svgManager)
            return
          res.statusCode = 200
          res.setHeader('Content-Type', 'image/svg+xml')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.write(shared.svgManager.spritemap, 'utf-8')
          res.end()
        }
        else {
          next()
        }
      })
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        /* v8 ignore if -- @preserve */
        if (!shared.svgManager)
          return html

        const replaceRegExp = new RegExp(`${escapeRegExp(shared.routeUrl)}-\\d*|${escapeRegExp(shared.routeUrl)}`, 'g')
        html = html.replace(
          replaceRegExp,
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

      if (!picomatch.isMatch(relativePath, shared.svgManager.iconsPattern) && !picomatch.isMatch(absolutePath, shared.svgManager.iconsPattern))
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
          route: { ...shared.options.route, url: shared.routeUrl },
          id: shared.svgManager.hash,
          spritemap: shared.options?.injectSvgOnDev ? shared.svgManager.spritemap : '',
        } satisfies HMRUpdate,
      })

      return []
    },
    transform: {
      filter: {
        id: filterCSS,
      },
      handler(code, id) {
        /* v8 ignore if -- @preserve */
        if (!shared.svgManager || !filterCSS.test(id))
          return

        const replaceRegExp = new RegExp(`${escapeRegExp(shared.routeUrl)}-\\d*|${escapeRegExp(shared.routeUrl)}`, 'g')
        return {
          code: code.replace(
            replaceRegExp,
            `${shared.routeUrl}__${shared.svgManager.hash}`,
          ),
          map: null,
        }
      },
    },
  }
}
