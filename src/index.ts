import type { Plugin } from 'vite'
import type { UserOptions, Options, Pattern } from './types'
import { BuildPlugin } from './plugins/build'
import { DevPlugin } from './plugins/dev'
import { OptimizeOptions } from 'svgo'

export default function VitePluginSvgSpritemap(
  iconsPattern: Pattern,
  options: UserOptions = {}
): Plugin[] {
  //Default options
  const svgo: OptimizeOptions | false =
    {
      plugins: [
        {
          name: 'preset-default',
          params: {
            overrides: {
              removeEmptyAttrs: false,
              moveGroupAttrsToElems: false,
              collapseGroups: false,
              removeTitle: false,
              cleanupIDs: false
            }
          }
        }
      ]
    } || false

  let styles
  if (options.styles === true) {
    styles = {
      format: 'auto'
    }
  } else if (typeof options.styles === 'object') {
    styles = options.styles
  } else {
    styles = false
  }

  const _options: Options = Object.assign(options, {
    svgo,
    output: {
      filename: 'spritemap.[hash].svg'
    },
    prefix: 'sprite-',
    styles
  }) as Options

  return [
    BuildPlugin(iconsPattern, _options),
    DevPlugin(iconsPattern, _options)
  ]
}
