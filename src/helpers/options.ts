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
  const stylesLang = ['css', 'scss', 'less', 'styl']
  if (typeof options.styles === 'string') {
    let lang = options.styles.split('.').pop() as StylesLang | undefined
    const stylesLang = ['css', 'scss', 'less', 'styl']

    if (typeof lang === 'undefined' || !stylesLang.includes(lang)) {
      lang = 'css'
      console.warn(
        '[vite-plugin-spritemap]',
        'Invalid styles lang, fallback to css'
      )
    }

    styles = {
      filename: options.styles,
      lang
    }
  } else if (
    typeof options.styles === 'object' &&
    typeof options.styles.filename === 'string' &&
    typeof options.styles.lang === 'string' &&
    stylesLang.includes(options.styles.lang)
  ) {
    styles = {
      filename: options.styles.filename,
      lang: options.styles.lang
    }
  } else if (options.styles !== false) {
    console.error('[vite-plugin-spritemap]', 'Invalid styles option')
  }

  let output: OptionsOutput | false = {
    filename: 'spritemap.[hash][extname]',
    use: true,
    view: true
  }
  if (options.output === false) {
    output = false
  } else if (typeof options.output === 'string') {
    output = {
      filename: options.output,
      use: true,
      view: true
    }
  } else if (typeof options.output === 'object') {
    output = {
      filename: options.output.filename,
      use:
        typeof options.output.use !== 'undefined' ? options.output.use : true,
      view:
        typeof options.output.view !== 'undefined' ? options.output.view : true
    }
  }

  return {
    svgo,
    output,
    prefix: options.prefix || 'sprite-',
    styles
  } as Options
}
