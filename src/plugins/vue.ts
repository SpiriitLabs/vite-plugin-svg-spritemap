import type { Plugin, ResolvedConfig } from 'vite'
import type { Shared } from '@/types'
import { parse } from 'node:path'
import { log } from '@helpers/log'
import { filterSvgQuery, parseSvgQuery } from '@helpers/svgQuery'

export default function VuePlugin(shared: Shared): Plugin {
  let config: ResolvedConfig

  return {
    name: 'vite-plugin-svg-spritemap:vue',
    enforce: 'pre',
    apply(config) {
      // Plugin arrays can nest (presets, conditional lists)
      return (config.plugins ?? [])
        .flat(2)
        .some(plugin => plugin && typeof plugin === 'object' && 'name' in plugin && plugin.name === 'vite:vue')
    },
    configResolved(_config) {
      config = _config
    },
    load: {
      filter: {
        id: filterSvgQuery,
      },
      async handler(id) {
        const { options, svgManager } = shared
        const parsed = parseSvgQuery(id)
        if (!parsed || !svgManager || !options.output)
          return

        const { path, query } = parsed
        const { base: filename } = parse(path)
        const svg = svgManager.svgs.get(path)

        if (!svg)
          return

        // Dev serves the spritemap at `route__<hash>` for cache busting. In
        // build the route is rewritten to the emitted asset path instead, so
        // the raw route is left in place.
        const routeUrl = config.command === 'serve'
          ? `${shared.routeUrlBase}__${svgManager.hash}`
          : shared.routeUrlBase

        let source = ''

        if (query === 'view' && (options.output.view === false || options.output.use === false)) {
          log({ level: 'warn', message: `You need to enable the output.view and the output.use option to load ${id} as component with the ?view query.`, logger: config.logger })
        }
        else if (query === 'view') {
          const width = svg.width ? `width="${Math.ceil(svg.width)}"` : ''
          const height = svg.height ? `height="${Math.ceil(svg.height)}"` : ''
          source = `<img src="${routeUrl}#${options.prefix + svg.id}-view" ${[width, height].filter(item => item.length > 0).join(' ')}/>`
        }
        else {
          const reference = `${routeUrl}#${options.prefix + svg.id}`
          const hrefAttribute = options.output.hrefAttribute || 'xlink:href'
          const attributes = [
            hrefAttribute !== 'xlink:href' ? `href="${reference}"` : '',
            hrefAttribute !== 'href' ? `xlink:href="${reference}"` : '',
          ].filter(Boolean).join(' ')
          source = `<svg><slot/><use ${attributes}></use></svg>`
        }

        const { compileTemplate } = await import('vue/compiler-sfc')
        const { code } = compileTemplate({
          id,
          source,
          filename,
          transformAssetUrls: false,
        })

        return `${code}\nexport default { render: render }`
      },
    },
  }
}
