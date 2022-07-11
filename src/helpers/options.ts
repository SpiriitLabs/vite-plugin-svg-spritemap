import type { OptimizeOptions } from 'svgo'
import type { Options, UserOptions } from '../types'

export const createOptions = (options: UserOptions = {}): Options => {
  //Default options
  let svgo
  if (typeof options.svgo === 'object') {
    svgo = options.svgo
  } else if (svgo === false) {
    svgo = false
  } else {
    svgo = (prefix: string): OptimizeOptions => {
      return {
        plugins: [
          {
            name: 'preset-default',
            params: {
              overrides: {
                removeEmptyAttrs: false,
                moveGroupAttrsToElems: false,
                collapseGroups: false,
                cleanupIDs: {
                  prefix
                }
              }
            }
          }
        ]
      }
    }
  }

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
  if (options.output === false) {
    output = false
  } else if (typeof options.output === 'object') {
    output = options.output
  } else {
    output = {
      filename: 'spritemap.[hash][extname]'
    }
  }

  return Object.assign(options, {
    svgo,
    output,
    prefix: 'sprite-',
    styles
  }) as Options
}
