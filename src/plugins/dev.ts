import type { Plugin, ResolvedConfig } from 'vite'
import type { Options, Pattern } from '../types'
import fg from 'fast-glob'
import hash_sum from 'hash-sum'
import { createFilter } from 'rollup-pluginutils'
import { SVGManager } from '../svgManager'

const event = 'vite-plugin-svg-spritemap:update'

export function DevPlugin(iconsPattern: Pattern, options: Options): Plugin {
  let timeout: NodeJS.Timeout
  let id: string
  const filter = createFilter(/\.svg$/)
  const virtualModuleId = '/@vite-plugin-svg-spritemap/client'
  let svgManager: SVGManager
  let config: ResolvedConfig

  return <Plugin>{
    name: 'vite-plugin-svg-spritemap:dev',
    apply: 'serve',
    configResolved(_config) {
      config = _config
      svgManager = new SVGManager(iconsPattern, options, config)
    },
    resolveId(id) {
      if (id === virtualModuleId) {
        return id
      }
    },
    load(id) {
      if (id === virtualModuleId) {
        return generateHMR()
      }
    },
    async buildStart() {
      await svgManager.updateAll()

      const icons = await fg(iconsPattern)
      const directories: Set<string> = new Set()
      icons.forEach(icon => {
        const directory = icon.split('/').slice(0, -1).join('/')
        directories.add(directory)
      })

      directories.forEach(directory => this.addWatchFile(directory))
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/__spritemap')) {
          res.statusCode = 200
          res.setHeader('Content-Type', 'image/svg+xml')
          res.write(svgManager.spritemap, 'utf-8')
          res.end()
        } else {
          next()
        }
      })
    },
    transformIndexHtml: {
      enforce: 'post',
      async transform(html) {
        if (id) {
          html.replace(/__spritemap-\d*|__spritemap/g, `__spritemap__${id}`)
        }

        return html.replace(
          '</body>',
          `<script type="module" src="${virtualModuleId}"></script></body>`
        )
      }
    },
    handleHotUpdate(ctx) {
      if (!filter(ctx.file)) {
        return
      }

      clearTimeout(timeout)
      timeout = setTimeout(async () => {
        svgManager.update(ctx.file)
        id = hash_sum(svgManager.spritemap)
        ctx.server.ws.send({
          type: 'custom',
          event,
          data: {
            id
          }
        })
      })
    }
  }
}

function generateHMR() {
  return `import.meta.hot.on('${event}', data => {
    console.log('[vite-plugin-svg-spritemap]', 'update')
    const uses = document.getElementsByTagName('use')
    for (let i = 0; i < uses.length; i++) {
      const use = uses[i]
      const xlinkHrefAttr = use.getAttribute('xlink:href')
      const hrefAttr = use.getAttribute('href')
      if (hrefAttr !== null && xlinkHrefAttr !== null) continue
      const href = hrefAttr || xlinkHrefAttr
      const newHref = href.replace(
        /__spritemap.*#/g,
        '__spritemap__' + data.id + '#'
      )

      if (use.hasAttribute('xlink:href')) {
        use.setAttribute('xlink:href', newHref)
      } else if (use.hasAttribute('href')) {
        use.setAttribute('href', newHref)
      }
    }
  })
  `
}
