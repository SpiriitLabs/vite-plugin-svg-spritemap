import { Options } from '../types'
import type { Plugin } from 'vite'
import fg from 'fast-glob'
import { generateSpritemap } from '../generateSpritemap'

export function DevPlugin(options: Options) {
  let spritemap: string | false = false
  let timeout: NodeJS.Timeout
  let timestamp: string

  return <Plugin>{
    name: 'vite-plugin-svg-spritemap:dev',
    async load() {
      const icons = await fg(options.icons)
      for (const icon in icons) {
        this.addWatchFile(icon)
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!spritemap) {
          spritemap = await generateSpritemap(options.icons)
        }
        if (req.url?.startsWith('/__spritemap') && spritemap) {
          res.statusCode = 200
          res.setHeader('Content-Type', 'image/svg+xml')
          res.write(spritemap, 'utf-8')
          res.end()
        } else {
          next()
        }
      })
    },
    transformIndexHtml: {
      enforce: 'post',
      async transform(html) {
        if (!timestamp) {
          return html
        } else {
          return html.replace(
            /__spritemap-\d*|__spritemap/g,
            `__spritemap-${timestamp}`
          )
        }
      }
    },
    handleHotUpdate(ctx) {
      //generate new spritemap on icon changes
      if (ctx.file.endsWith('.svg')) {
        clearTimeout(timeout)
        timeout = setTimeout(async () => {
          spritemap = await generateSpritemap(options.icons)
          timestamp = Date.now().toString()
          ctx.server.ws.send({ type: 'full-reload' })
        })
      }
    }
  }
}
