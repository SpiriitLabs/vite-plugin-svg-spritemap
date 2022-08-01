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
                removeViewBox: false,
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
  if (typeof options.styles === 'object') {
    if (typeof options.styles.lang === 'string') {
      styles = options.styles
    } else {
      const lang = options.styles.filename.split('.').pop()
      styles = {
        filename: options.styles.filename,
        lang
      }
    }
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
