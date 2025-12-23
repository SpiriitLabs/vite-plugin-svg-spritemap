import type { Glob } from 'picomatch'
import type { Plugin, ResolvedConfig } from 'vite'
import type { Shared, UserOptionsLogs } from '@/types'
import { SVGManager } from '@core/svgManager'
import { log } from '@helpers/log'

export default function CommonPlugin(shared: Shared, iconsPattern: Glob, logsOptions: UserOptionsLogs): Plugin {
  let config: ResolvedConfig

  return {
    name: 'vite-plugin-svg-spritemap:common',
    enforce: 'pre',
    configResolved(_config) {
      config = _config
      logsOptions.warn.forEach(warn => log({ level: 'warn', message: warn, logger: config.logger }))

      shared.routeUrl = shared.options.route.url
      if (_config.command === 'serve') {
        const { base } = _config
        if (base && base !== '/') {
          const { url } = shared.options.route
          const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
          const normalizedUrl = url.startsWith('/') ? url : `/${url}`
          shared.routeUrl = `${normalizedBase}${normalizedUrl}`
        }
      }

      shared.svgManager = new SVGManager(iconsPattern, shared.options, _config, shared.routeUrl)
    },
  }
}
