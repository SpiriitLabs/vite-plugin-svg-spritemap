import type { Plugin } from 'vite'
import type { SVGManager } from '../svgManager'
import type { Options } from '../types'

const event = 'vite-plugin-svg-spritemap:update'

export default function DevPlugin(shared: { svgManager: SVGManager | null }, options: Options): Plugin {
  const filterSVG = /\.svg$/
  const filterCSS = /\.(s?css|styl|less)$/
  const virtualModuleId = `/@vite-plugin-svg-spritemap/client${options.route}`

  return <Plugin>{
    name: 'vite-plugin-svg-spritemap:dev',
    apply: 'serve',
    resolveId(id) {
      if (id === virtualModuleId)
        return id
    },
    load(id) {
      if (id === virtualModuleId)
        return generateHMR(shared.svgManager?.spritemap)
    },
    async buildStart() {
      await shared.svgManager?.updateAll()
      shared.svgManager?.directories.forEach(directory => this.addWatchFile(directory))
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith(`/${options.route}`)) {
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
        const replaceRegExp = new RegExp(`${options.route}-\d*|${options.route}`, 'g')
        html = html.replace(
          replaceRegExp,
          `${options.route}__${shared.svgManager?.hash}`,
        )

        return html.replace(
          '</body>',
          `<script type="module" src="${virtualModuleId}"></script></body>`,
        )
      },
    },
    async handleHotUpdate(ctx) {
      if (!shared.svgManager)
        return

      if (!ctx.file.match(filterSVG))
        return

      await shared.svgManager.update(ctx.file)

      ctx.server.ws.send({
        type: 'custom',
        event,
        data: {
          id: shared.svgManager.hash,
          spritemap: options.injectSvgOnDev ? shared.svgManager.spritemap : '',
        },
      })
    },
    transform(code, id) {
      if (!id.match(filterCSS))
        return { code, map: null }

      const replaceRegExp = new RegExp(`${options.route}-\d*|${options.route}`, 'g')
      return {
        code: code.replace(
          replaceRegExp,
          `${options.route}__${shared.svgManager?.hash}`,
        ),
        map: null,
      }
    },
  }

  function generateHMR(spritemap?: string) {
    const injectSvg = `
    const injectSvg = (data) => {
      const oldWrapper = document.getElementById('vite-plugin-svg-spritemap')
      if (oldWrapper)
        oldWrapper.remove()

      const wrapper = document.createElement('div')
      wrapper.innerHTML = data.spritemap
      wrapper.id = 'vite-plugin-svg-spritemap'
      wrapper.style.display = 'none'
      document.body.append(wrapper)
    }`

    const updateElements = `
    const elements = document.querySelectorAll(
      '[src*=${options.route}], [href*=${options.route}], [*|href*=${options.route}]'
    )

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]
      const attributes = ['xlink:href', 'href', 'src']
      for (const attr of attributes) {
        if (!el.hasAttribute(attr)) continue
        const value = el.getAttribute(attr)
        if (!value) continue
        const newValue = value.replace(
          /${options.route}.*#/g,
          '${options.route}__' + data.id + '#'
        )
        el.setAttribute(attr, newValue)
      }
    }`

    return `console.debug('[vite-plugin-svg-spritemap]', 'connected.')
      ${options.injectSvgOnDev ? injectSvg : ''}
      ${options.injectSvgOnDev ? `injectSvg(${JSON.stringify({ spritemap })})` : ''}
      if (import.meta.hot) {
        import.meta.hot.on('${event}', data => {
          console.debug('[vite-plugin-svg-spritemap]', 'update')
          ${updateElements}
          ${options.injectSvgOnDev ? 'injectSvg(data)' : ''}
        })
      }`
  }
}
