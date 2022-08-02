import type { OptimizeOptions } from 'svgo'
import type {
  Options,
  OptionsOutput,
  UserOptions,
  OptionsStyles,
  StylesLang
} from '../types'

export const createOptions = (options: UserOptions = {}): Options => {
  //Default options
  let svgo
  if (typeof options.svgo === 'object') {
    svgo = options.svgo
  } else if (options.svgo === false) {
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

  let styles: OptionsStyles | false = false
  if (typeof options.styles === 'object') {
    if (typeof options.styles.lang === 'string') {
      styles = {
        filename: options.styles.filename,
        lang: options.styles.lang
      }
    } else {
      const lang = options.styles.filename.split('.').pop() as
        | StylesLang
        | undefined
      styles = {
        filename: options.styles.filename,
        lang: lang ? lang : 'css'
      }
    }
  } else if (typeof options.styles === 'string') {
    const lang = options.styles.split('.').pop() as StylesLang | undefined
    styles = {
      filename: options.styles,
      lang: lang ? lang : 'css'
    }
  }

  let output: OptionsOutput | false = {
    filename: 'spritemap.[hash][extname]',
    use: true,
    view: true
  }
  if (options.output === false) {
    output = false
  } else if (typeof options.output === 'object') {
    output = {
      filename: options.output.filename,
      use: options.output.use || true,
      view: options.output.view || true
    }
  }

  return {
    svgo,
    output,
    prefix: options.prefix || '-prefix',
    styles
  } as Options
}
