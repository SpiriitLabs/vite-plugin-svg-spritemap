import { Options } from '../types'
import type { Plugin } from 'vite'
import fg from 'fast-glob'
import { generateSpritemap } from '../generateSpritemap'

export function DevPlugin(options: Options) {
  let spritemap: string | false = false

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
        if (req.url === '/spritemap.svg' && spritemap) {
          res.statusCode = 200
          res.setHeader('Content-Type', 'image/svg+xml')
          res.write(spritemap, 'utf-8')
          res.end()
        } else {
          next()
        }
      })
    },
    handleHotUpdate() {
      //generate new spritemap on icon changes
    }
  }
}
