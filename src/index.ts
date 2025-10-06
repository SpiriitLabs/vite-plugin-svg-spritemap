import type { Plugin } from 'vite'
import type { Pattern, UserOptions } from './types'
import { createOptions } from './helpers/options'
import BuildPlugin from './plugins/build'
import DevPlugin from './plugins/dev'
import VuePlugin from './plugins/vue'
import { SVGManager } from './svgManager'

export default function VitePluginSvgSpritemap(
  iconsPattern: Pattern,
  options?: UserOptions,
): Plugin[] {
  const _options = createOptions(options)
  const shared = { svgManager: null as SVGManager | null }

  function OrchestratorPlugin(): Plugin {
    return {
      name: 'vite-plugin-svg-spritemap:orchestrator',
      enforce: 'pre',
      configResolved(_config) {
        shared.svgManager = new SVGManager(iconsPattern, _options, _config)
      },
    }
  }

  return [
    OrchestratorPlugin(),
    BuildPlugin(shared, _options),
    DevPlugin(shared, _options),
    VuePlugin(shared, _options),
  ]
}
