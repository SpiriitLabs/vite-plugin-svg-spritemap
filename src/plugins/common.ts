import type { Plugin, ResolvedConfig } from 'vite'
import type { Pattern, Shared, UserOptions } from '../types'
import vueComponentTransformer from '../helpers/vue'
import { SVGManager } from '../svgManager'
import { createOptions } from './../helpers/options'

export default function CommonPlugin(shared: Shared, iconsPattern: Pattern, options?: UserOptions): Plugin {
  let config: ResolvedConfig

  return {
    name: 'vite-plugin-svg-spritemap:common',
    enforce: 'pre',
    configResolved(_config) {
      config = _config
      const _options = createOptions(options, shared.route, config.logger)
      shared.options = _options
      shared.svgManager = new SVGManager(iconsPattern, _options, _config)
    },
    async load(id) {
      const vueComponent = await vueComponentTransformer({ id, shared, config })
      if (vueComponent)
        return vueComponent
    },
  }
}
