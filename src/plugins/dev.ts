import type { Plugin } from 'vite'
import type { Options, Shared } from '../types'
import micromatch from 'micromatch'

export default function DevPlugin(shared: Shared): Plugin {
  const filterSVG = /\.svg$/
  const filterCSS = /\.(s?css|styl|less)$/

  function getVirtualModuleId() {
    const virtualModuleId = '/@vite-plugin-svg-spritemap/client'
    if (!shared.options)
      return virtualModuleId
    return `${virtualModuleId}${shared.options.route}`
  }

  function getEventName() {
    const event = 'vite-plugin-svg-spritemap:update'
    if (shared.options && shared.options.route)
      return `${event}:${shared.options.route}`
    return event
  }

  return <Plugin>{
    name: 'vite-plugin-svg-spritemap:dev',
    apply: 'serve',
    resolveId(id) {
      if (id === getVirtualModuleId())
        return id
    },
    load(id) {
      if (id === getVirtualModuleId() && shared.options && shared.svgManager)
        return generateHMR(shared.svgManager.spritemap, shared.options)
    },
    async buildStart() {
      await shared.svgManager?.updateAll()
      shared.svgManager?.directories.forEach(directory => this.addWatchFile(directory))
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (shared.options && req.url?.startsWith(`/${shared.options.route}`)) {
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
        if (!shared.options || !shared.svgManager)
          return html

        const replaceRegExp = new RegExp(`${shared.options.route}-\d*|${shared.options.route}`, 'g')
        html = html.replace(
          replaceRegExp,
          `${shared.options.route}__${shared.svgManager.hash}`,
        )

        return html.replace(
          '</body>',
          `<script type="module" src="${getVirtualModuleId()}"></script></body>`,
        )
      },
    },
    async watchChange(id, { event }) {
      if (!shared.svgManager || !id.match(filterSVG))
        return

      if ((event === 'update' || event === 'delete') && shared.svgManager.has(id)) {
        if (event === 'update')
          await shared.svgManager.update(id)
        else
          await shared.svgManager.delete(id)
      }
      else if (event === 'create' && micromatch.isMatch(id, shared.svgManager.iconsPattern)) {
        await shared.svgManager.update(id)
      }
    },
    async handleHotUpdate(ctx) {
      if (!shared.svgManager)
        return

      if (!ctx.file.match(filterSVG) || !shared.svgManager.has(ctx.file))
        return

      const event = getEventName()
      ctx.server.ws.send({
        type: 'custom',
        event,
        data: {
          id: shared.svgManager.hash,
          spritemap: shared.options?.injectSvgOnDev ? shared.svgManager.spritemap : '',
        },
      })
    },
    transform(code, id) {
      if (!id.match(filterCSS) || !shared.options || !shared.svgManager)
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
        import.meta.hot.on('${getEventName()}', data => {
          console.debug('[vite-plugin-svg-spritemap]', 'update')
          ${updateElements}
          ${options.injectSvgOnDev ? 'injectSvg(data)' : ''}
        })
      }`
  }
}
