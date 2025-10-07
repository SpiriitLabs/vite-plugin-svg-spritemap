import type { Plugin } from 'vite'
import type { Pattern, Shared, UserOptions } from './types'
import BuildPlugin from './plugins/build'
import CommonPlugin from './plugins/common'
import DevPlugin from './plugins/dev'

export default function VitePluginSvgSpritemap(
  iconsPattern: Pattern,
  options?: UserOptions,
): Plugin[] {
  const shared: Shared = { svgManager: null, options: null }

  return [
    CommonPlugin(shared, iconsPattern, options),
    BuildPlugin(shared),
    DevPlugin(shared),
  ]
}
