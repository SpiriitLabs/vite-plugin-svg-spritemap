import type { ResolvedConfig } from 'vite'
import type { Shared } from '../types'
import { parse } from 'node:path'

const filterVueComponent = /\.svg\?(use|view)?$/

export default async function vueComponentTransformer(obj: { id: string, config: ResolvedConfig, shared: Shared }) {
  const { id, config, shared } = obj
  const { options, svgManager } = shared
  if (!options || !svgManager || config.plugins.findIndex(plugin => plugin.name === 'vite:vue') === -1 || !options.output)
    return false
  if (!id.match(filterVueComponent))
    return false

  const [path, query] = id.split('?', 2)
  const { base: filename } = parse(path)
  const svg = svgManager?.svgs.get(path)

  let source = ''

  if (query === 'view' && (options.output.view === false || options.output.use === false)) {
    config.logger.warn(`[vite-plugin-svg-spritemap] You need to enable the output.view and the output.use option to load ${id} as component with the ?view query.`)
  }
  else if (query === 'view') {
    const width = svg?.width ? `width="${Math.ceil(svg.width)}"` : ''
    const height = svg?.width ? `height="${Math.ceil(svg.height)}"` : ''
    source = `<img src="/${options.route}#${options.prefix + svg?.id}-view" ${[width, height].filter(item => item.length > 0).join(' ')}/>`
  }
  else {
    source = `<svg><slot/><use xlink:href="/${options.route}#${options.prefix + svg?.id}"></use></svg>`
  }

  const { compileTemplate } = await import('vue/compiler-sfc')
  const { code } = compileTemplate({
    id,
    source,
    filename,
    transformAssetUrls: false,
  })

  return `${code}\nexport default { render: render }`
}
