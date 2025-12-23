import type { Glob } from 'picomatch'
import type { Plugin, ResolvedConfig } from 'vite'
import type { Shared, UserOptionsLogs } from '@/types'
import { SVGManager } from '@core/svgManager'
import { log } from '@helpers/log'
import { getBaseUrl } from '@/helpers/baseUrl'

export default function CommonPlugin(shared: Shared, iconsPattern: Glob, logsOptions: UserOptionsLogs): Plugin {
  let config: ResolvedConfig

  return {
    name: 'vite-plugin-svg-spritemap:common',
    enforce: 'pre',
    configResolved(_config) {
      config = _config
      logsOptions.warn.forEach(warn => log({ level: 'warn', message: warn, logger: config.logger }))

      shared.routeUrl = shared.options.route.url
      if (_config.command === 'serve')
        shared.routeUrl = getBaseUrl(shared.options.route.url, _config.base)

      shared.svgManager = new SVGManager(iconsPattern, shared.options, _config, shared.routeUrl)
    },
  }
}
