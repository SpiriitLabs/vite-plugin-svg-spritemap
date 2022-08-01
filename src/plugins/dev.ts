import type { Plugin, ResolvedConfig } from 'vite'
import fg from 'fast-glob'
import { createFilter } from 'rollup-pluginutils'
import { SVGManager } from '../svgManager'
import type { Options, Pattern } from '../types'

const event = 'vite-plugin-svg-spritemap:update'

export function DevPlugin(iconsPattern: Pattern, options: Options): Plugin {
  const filterSVG = createFilter(/\.svg$/)
  const filterCSS = createFilter(/\.(s?css|styl|less)$/)
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
      enforce: 'pre',
      transform(html) {
        html = html.replace(
          /__spritemap-\d*|__spritemap/g,
          `__spritemap__${svgManager.hash}`
        )

        return html.replace(
          '</body>',
          `<script type="module" src="${virtualModuleId}"></script></body>`
        )
      }
    },
    async handleHotUpdate(ctx) {
      if (!filterSVG(ctx.file)) {
        return
      }

      await svgManager.update(ctx.file)

      ctx.server.ws.send({
        type: 'custom',
        event,
        data: {
          id: svgManager.hash
        }
      })
    },
    transform(code, id) {
      console.log(id)
      if (!filterCSS(id)) {
        return code
      }

      return code.replace(
        /__spritemap-\d*|__spritemap/g,
        `__spritemap__${svgManager.hash}`
      )
    }
  }
}

function generateHMR() {
  return `if (import.meta.hot) {
  import.meta.hot.on('${event}', data => {
    console.log('[vite-plugin-svg-spritemap]', 'update')
    const elements = document.querySelectorAll(
      '[src^=__spritemap], [href^=__spritemap], [*|href^=__spritemap]'
    )

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]
      const attributes = ['xlink:href', 'href', 'src']
      for (const attr of attributes) {
        if (!el.hasAttribute(attr)) continue
        const value = el.getAttribute(attr)
        if (!value) continue
        const newValue = value.replace(
          /__spritemap.*#/g,
          '__spritemap__' + data.id + '#'
        )
        el.setAttribute(attr, newValue)
      }
    }
  })
}`
}
