import type { Plugin } from 'vite'
import type { Pattern, UserOptions } from './types'
import { createOptions } from './helpers/options'
import BuildPlugin from './plugins/build'
import DevPlugin from './plugins/dev'
import VuePlugin from './plugins/vue'

export default function VitePluginSvgSpritemap(
  iconsPattern: Pattern,
  options?: UserOptions,
): Plugin[] {
  const _options = createOptions(options)

  return [
    BuildPlugin(iconsPattern, _options),
    DevPlugin(iconsPattern, _options),
    VuePlugin(iconsPattern, _options),
  ]
}
