import type { Plugin, ResolvedConfig } from 'vite'
import type { Options, Pattern } from '../types'
import { SVGManager } from '../svgManager'

const event = 'vite-plugin-svg-spritemap:update'

export default function DevPlugin(iconsPattern: Pattern, options: Options): Plugin {
  const filterSVG = /\.svg$/
  const filterCSS = /\.(s?css|styl|less)$/
  const virtualModuleId = `/@vite-plugin-svg-spritemap/client${options.route}`
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
      if (id === virtualModuleId)
        return id
    },
    load(id) {
      if (id === virtualModuleId)
        return generateHMR(svgManager.spritemap)
    },
    async buildStart() {
      await svgManager.updateAll()
      svgManager.directories.forEach(directory => this.addWatchFile(directory))
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith(`/${options.route}`)) {
          res.statusCode = 200
          res.setHeader('Content-Type', 'image/svg+xml')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.write(svgManager.spritemap, 'utf-8')
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
          `${options.route}__${svgManager.hash}`,
        )

        return html.replace(
          '</body>',
          `<script type="module" src="${virtualModuleId}"></script></body>`,
        )
      },
    },
    async handleHotUpdate(ctx) {
      if (!ctx.file.match(filterSVG))
        return

      await svgManager.update(ctx.file)

      ctx.server.ws.send({
        type: 'custom',
        event,
        data: {
          id: svgManager.hash,
          spritemap: options.injectSvgOnDev ? svgManager.spritemap : '',
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
          `${options.route}__${svgManager.hash}`,
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
