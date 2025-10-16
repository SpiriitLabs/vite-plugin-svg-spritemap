import type { Plugin } from 'vite'
import type { Options, Shared } from '../types'
import { relative } from 'node:path'
import picomatch from 'picomatch'

export default function DevPlugin(shared: Shared): Plugin {
  const filterSVG = /\.svg$/
  const filterCSS = /\.(s?css|styl|less)$/

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
        return id
      },
    },
    load: {
      filter: {
        id: virtualModuleId,
      },
      handler() {
        if (shared.svgManager)
          return generateHMR(shared.svgManager.spritemap, shared.options)
      },
    },
    async buildStart() {
      await shared.svgManager?.updateAll()
      shared.svgManager?.directories.forEach(directory => this.addWatchFile(directory))
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith(`/${shared.options.route}`)) {
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
        if (!shared.svgManager)
          return html

        const replaceRegExp = new RegExp(`${shared.options.route}-\d*|${shared.options.route}`, 'g')
        html = html.replace(
          replaceRegExp,
          `${shared.options.route}__${shared.svgManager.hash}`,
        )

        return html.replace(
          '</body>',
          `<script type="module" src="${virtualModuleId}"></script></body>`,
        )
      },
    },
    async hotUpdate({ file, type }) {
      if (!shared.svgManager)
        return

      if (!file.match(filterSVG))
        return

      const relativePath = relative(this.environment.config.root, file)
      if (!picomatch.isMatch(relativePath, shared.svgManager.iconsPattern))
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
          route: shared.options.route,
          id: shared.svgManager.hash,
          spritemap: shared.options?.injectSvgOnDev ? shared.svgManager.spritemap : '',
        },
      })

      return []
    },
    transform: {
      filter: {
        id: filterCSS,
      },
      handler(code) {
        if (!shared.svgManager)
          return

        const replaceRegExp = new RegExp(`${shared.options.route}-\d*|${shared.options.route}`, 'g')
        return {
          code: code.replace(
            replaceRegExp,
            `${shared.options.route}__${shared.svgManager.hash}`,
          ),
          map: null,
        }
      },
    },
  }

  function generateHMR(spritemap: string | undefined, options: Options) {
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
      '[src*=' + data.route + '], [href*=' + data.route + '], [*|href*=' + data.route + ']'
    )

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]
      const attributes = ['xlink:href', 'href', 'src']
      for (const attr of attributes) {
      if (!el.hasAttribute(attr)) continue
      const value = el.getAttribute(attr)
      if (!value) continue
      const newValue = value.replace(
        new RegExp(data.route + '.*#', 'g'),
        data.route + '__' + data.id + '#'
      )
      el.setAttribute(attr, newValue)
      }
    }`

    return `console.debug('[vite-plugin-svg-spritemap]', 'connected.')
      ${options.injectSvgOnDev ? injectSvg : ''}
      ${options.injectSvgOnDev ? `injectSvg(${JSON.stringify({ spritemap })})` : ''}
      if (import.meta.hot) {
        import.meta.hot.on('${event}', data => {
          console.debug('[vite-plugin-svg-spritemap]', 'update for route ' + data.route)
          ${updateElements}
          ${options.injectSvgOnDev ? 'injectSvg(data)' : ''}
        })
      }`
  }
}
