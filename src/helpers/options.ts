import type { OptimizeOptions } from 'svgo'
import type { Options, UserOptions } from '../types'

export const createOptions = (options: UserOptions = {}): Options => {
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

  let output
  if (options.output === true) {
    output = {
      filename: 'spritemap.[hash].svg'
    }
  } else if (typeof options.output === 'object') {
    output = options.output
  } else {
    output = false
  }

  return Object.assign(options, {
    svgo,
    output,
    prefix: 'sprite-',
    styles
  }) as Options
}
