import type { Options, OptionsStyles, StylesLang, UserOptions } from '../types'

export function createOptions(options: UserOptions = {}): Options {
  let prefix: Options['prefix'] = 'sprite-'
  if (options.prefix === false)
    prefix = ''
  else if (typeof options.prefix === 'string')
    prefix = options.prefix

  let styles: Options['styles'] = false
  const stylesLang = ['css', 'scss', 'less', 'styl']
  if (typeof options.styles === 'string') {
    let lang = options.styles.split('.').pop() as StylesLang | undefined

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
      include: true,
      names: {
        prefix: 'sprites-prefix',
        sprites: 'sprites',
        mixin: 'sprite',
      },
      variables: false,
    }
  }
  else if (
    typeof options.styles === 'object'
    && typeof options.styles.filename === 'string'
  ) {
    const stylesNames: OptionsStyles['names'] = {
      prefix: options.styles.names?.prefix || 'sprites-prefix',
      sprites: options.styles.names?.sprites || 'sprites',
      mixin: options.styles.names?.mixin || 'sprite',
    }

    let lang = options.styles.filename.split('.').pop() as StylesLang | undefined
    if (typeof lang === 'undefined' || !stylesLang.includes(lang)) {
      lang = 'css'
      console.warn(
        '[vite-plugin-spritemap]',
        'Invalid styles lang, fallback to css',
      )
    }

    styles = {
      filename: options.styles.filename,
      lang,
      include: typeof options.styles.include === 'undefined' ? true : options.styles.include,
      names: stylesNames,
      callback: options.styles.callback,
      variables: options.styles.variables || false,
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
      filename: options.output.filename || output.filename,
      name: options.output.name || output.name,
      use:
        typeof options.output.use !== 'undefined'
          ? options.output.use
          : output.use,
      view:
        typeof options.output.view !== 'undefined'
          ? options.output.view
          : output.view,
    }
  }

  const injectSvgOnDev = options.injectSvgOnDev || options.injectSVGOnDev || false

  // Idify
  let idify: UserOptions['idify'] = name => name

  if (typeof options.idify === 'function')
    idify = options.idify

  let route = '__spritemap'
  if (typeof options.route === 'string')
    route = options.route

  const gutter = options.gutter || 0

  return {
    svgo: options.svgo,
    output,
    prefix,
    styles,
    injectSvgOnDev,
    idify,
    route,
    gutter,
  } satisfies Options
}
