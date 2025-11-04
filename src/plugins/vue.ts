import type { Plugin, ResolvedConfig } from 'vite'
import type { Shared } from '../types'
import { parse } from 'node:path'
import { log } from '../helpers/log'

export default function CommonPlugin(shared: Shared): Plugin {
  let config: ResolvedConfig
  const filterVueComponent = /\.svg\?(use|view)?$/

  return {
    name: 'vite-plugin-svg-spritemap:vue',
    enforce: 'pre',
    apply(config) {
      return config.plugins?.findIndex(plugin => plugin && 'name' in plugin && plugin.name === 'vite:vue') !== -1
    },
    configResolved(_config) {
      config = _config
    },
    load: {
      filter: {
        id: filterVueComponent,
      },
      async handler(id) {
        const { options, svgManager } = shared
        if (!svgManager || !options.output || !id.match(filterVueComponent))
          return

        const [path, query] = id.split('?', 2)
        const { base: filename } = parse(path)
        const svg = svgManager.svgs.get(path)

        if (!svg)
          return

        let source = ''

        if (query === 'view' && (options.output.view === false || options.output.use === false)) {
          log({ level: 'warn', message: `You need to enable the output.view and the output.use option to load ${id} as component with the ?view query.`, logger: config.logger })
        }
        else if (query === 'view') {
          const width = svg.width ? `width="${Math.ceil(svg.width)}"` : ''
          const height = svg.height ? `height="${Math.ceil(svg.height)}"` : ''
          source = `<img src="${options.route.url}#${options.prefix + svg.id}-view" ${[width, height].filter(item => item.length > 0).join(' ')}/>`
        }
        else {
          source = `<svg><slot/><use xlink:href="${options.route.url}#${options.prefix + svg.id}"></use></svg>`
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
