import type { Plugin, ResolvedConfig } from 'vite'
import type { Pattern, Shared, UserOptionsLogs } from '../types'
import { SVGManager } from '../svgManager'

export default function CommonPlugin(shared: Shared, iconsPattern: Pattern, logsOptions: UserOptionsLogs): Plugin {
  let config: ResolvedConfig

  return {
    name: 'vite-plugin-svg-spritemap:common',
    enforce: 'pre',
    configResolved(_config) {
      config = _config
      logsOptions.warn.forEach(warn => config.logger.warn(warn))
      shared.svgManager = new SVGManager(iconsPattern, shared.options, _config)
    },
  }
}
