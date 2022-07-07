import { AdvancedOptions, Pattern } from '../types'
import type { Plugin } from 'vite'
import fg from 'fast-glob'
import { generateSpritemap } from '../generateSpritemap'
import hash_sum from 'hash-sum'

export function DevPlugin(iconsPattern: Pattern, options?: AdvancedOptions) {
  let spritemap: string | false = false
  let timeout: NodeJS.Timeout
  let id: string

  return <Plugin>{
    name: 'vite-plugin-svg-spritemap:dev',
    async load() {
      const icons = await fg(iconsPattern)
      for (const icon in icons) {
        this.addWatchFile(icon)
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!spritemap) {
          spritemap = await generateSpritemap(iconsPattern)
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
        if (!id) {
          return html
        } else {
          return html.replace(
            /__spritemap-\d*|__spritemap/g,
            `__spritemap__${id}`
          )
        }
      }
    },
    handleHotUpdate(ctx) {
      if (ctx.file.endsWith('.svg')) {
        clearTimeout(timeout)
        timeout = setTimeout(async () => {
          spritemap = await generateSpritemap(iconsPattern)
          id = hash_sum(spritemap)
          ctx.server.ws.send({ type: 'full-reload' })
        })
      }
    }
  }
}
