import type { Glob } from 'picomatch'
import type { Plugin } from 'vite'
import type { Shared, UserOptions } from '@/types'
import { createOptions } from '@helpers/options'
import BuildPlugin from '@plugins/build'
import CommonPlugin from '@plugins/common'
import DevPlugin from '@plugins/dev'
import VuePlugin from '@plugins/vue'

/** An allowlist rather than a re-export, so `Shared` and `UserOptionsLogs` stay internal. */
export type {
  Options,
  OptionsOutput,
  OptionsRoute,
  OptionsStyles,
  OptionsStylesNames,
  OptionsStylesSizes,
  OptionsTypes,
  OptionsVariables,
  SpritemapGenerator,
  StylesCallback,
  StylesCallbackContext,
  StylesInclude,
  StylesLang,
  SvgDataUriMapObject,
  SvgMapObject,
  SvgVariables,
  TypesConfig,
  TypesOptions,
  UserOptions,
  VariablesSpritemapMode,
} from '@/types'

export default function VitePluginSvgSpritemap(
  iconsPattern: Glob,
  options?: UserOptions,
): Plugin[] {
  const { options: _options, logs: _logsOptions } = createOptions(options)
  const shared: Shared = { svgManager: null, options: _options, routeUrl: '', routeUrlBase: '' }

  return [
    CommonPlugin(shared, iconsPattern, _logsOptions),
    BuildPlugin(shared),
    DevPlugin(shared),
    VuePlugin(shared),
  ]
}
