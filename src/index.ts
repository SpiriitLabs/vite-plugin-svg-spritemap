import type { Plugin } from 'vite'
import type { Pattern, Shared, UserOptions } from './types'
import BuildPlugin from './plugins/build'
import CommonPlugin from './plugins/common'
import DevPlugin from './plugins/dev'

export default function VitePluginSvgSpritemap(
  iconsPattern: Pattern,
  options?: UserOptions,
): Plugin[] {
  // Get route before options are created because it is used on load/transform hooks filters
  let route = '__spritemap'
  if (typeof options?.route === 'string')
    route = options.route

  const shared: Shared = { svgManager: null, options: null, route }

  return [
    CommonPlugin(shared, iconsPattern, options),
    BuildPlugin(shared),
    DevPlugin(shared),
  ]
}
