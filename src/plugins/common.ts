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

      // Raw, base-agnostic route. Stays identical in dev and build so the
      // generated style/type artifacts are deterministic.
      shared.routeUrl = shared.options.route.url

      // Browser-facing route. The dev server serves the spritemap behind
      // `config.base`, so prefix it there. In build the base is applied later
      // by the build plugin when rewriting to the emitted asset path, so the
      // browser-facing value matches the raw route here.
      shared.routeUrlBase = shared.routeUrl
      if (_config.command === 'serve') {
        const { base } = _config
        if (base && base !== '/') {
          const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
          const normalizedUrl = shared.routeUrl.startsWith('/') ? shared.routeUrl : `/${shared.routeUrl}`
          shared.routeUrlBase = `${normalizedBase}${normalizedUrl}`
        }
      }

      // Style/type files embed the raw route; the dev/build url rewriting
      // resolves it to the base-aware path at serve/build time.
      shared.svgManager = new SVGManager(iconsPattern, shared.options, _config, shared.routeUrl)
    },
  }
}
