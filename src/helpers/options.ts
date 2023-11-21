import type { Options, StylesLang, UserOptions } from '../types'

export function createOptions(options: UserOptions = {}): Options {
  const prefix: Options['prefix'] = options.prefix || 'sprite-'

  // Default options
  let svgo: Options['svgo'] = {
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            removeViewBox: false,
            removeEmptyAttrs: false,
            moveGroupAttrsToElems: false,
            collapseGroups: false,
            cleanupIds: {
              preservePrefixes: [prefix],
            },
          },
        },
      },
    ],
  }
  if (typeof options.svgo === 'object' || options.svgo === false)
    svgo = options.svgo

  let styles: Options['styles'] = false
  const stylesLang = ['css', 'scss', 'less', 'styl']
  if (typeof options.styles === 'string') {
    let lang = options.styles.split('.').pop() as StylesLang | undefined
    const stylesLang = ['css', 'scss', 'less', 'styl']

    if (typeof lang === 'undefined' || !stylesLang.includes(lang)) {
      lang = 'css'
      console.warn(
        '[vite-plugin-spritemap]',
        'Invalid styles lang, fallback to css',
      )
    }

    styles = {
      filename: options.styles,
      lang,
    }
  }
  else if (
    typeof options.styles === 'object'
      && typeof options.styles.filename === 'string'
      && typeof options.styles.lang === 'string'
      && stylesLang.includes(options.styles.lang)
  ) {
    styles = {
      filename: options.styles.filename,
      lang: options.styles.lang,
    }
  }

  let output: Options['output'] = {
    filename: '[name].[hash][extname]',
    name: 'spritemap.svg',
    use: true,
    view: true,
  }
  if (options.output === false) {
    output = false
  }
  else if (typeof options.output === 'string') {
    output.filename = options.output
  }
  else if (typeof options.output === 'object') {
    output = {
      filename: options.output.filename,
      name: options.output.name || 'spritemap.svg',
      use:
        typeof options.output.use !== 'undefined' ? options.output.use : true,
      view:
        typeof options.output.view !== 'undefined' ? options.output.view : true,
    }
  }

  const injectSVGOnDev = options.injectSVGOnDev || false

  return {
    svgo,
    output,
    prefix,
    styles,
    injectSVGOnDev,
  } satisfies Options
}
