import { parse } from 'node:path'
import { type Plugin, type ResolvedConfig, createFilter } from 'vite'
import { SVGManager } from '../svgManager'
import type { Options, Pattern } from '../types'

export default function VuePlugin(iconsPattern: Pattern, options: Options): Plugin {
  const filterVueComponent = createFilter(/\.svg\?(use|view)?$/)
  let svgManager: SVGManager
  let config: ResolvedConfig

  return <Plugin>{
    name: 'vite-plugin-svg-spritemap:vue',
    enforce: 'pre',
    configResolved(_config) {
      config = _config
      if (config.plugins.findIndex(plugin => plugin.name === 'vite:vue') === -1 || !options.output)
        return
      svgManager = new SVGManager(iconsPattern, options, config)
      svgManager.updateAll()
    },
    async load(id) {
      if (config.plugins.findIndex(plugin => plugin.name === 'vite:vue') === -1 || !options.output)
        return
      if (!filterVueComponent(id))
        return

      const [path, query] = id.split('?', 2)
      const { name, base: filename } = parse(path)
      const svg = svgManager.svgs.get(name)

      let source = ''

      if (options.output[query as 'use' | 'view'] === false)
        return config.logger.warn(`[vite-plugin-svg-spritemap] You need to enable the ${query} option to load ${id} as component.`)

      if (query === 'view')
        source = `<img src="__spritemap#${options.prefix}${name}-view" width="${svg?.width || ''}" height="${svg?.height || ''}" />`
      else
        source = `<svg><slot/><use href="__spritemap#${options.prefix}${name}"></use></svg>`

      const { compileTemplate } = await import('vue/compiler-sfc')
      const { code } = compileTemplate({
        id,
        source,
        filename,
        transformAssetUrls: false,
      })

      return `${code}\nexport default { render: render }`
    },
  }
}
