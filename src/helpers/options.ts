import type { Options, OptionsRoute, OptionsStyles, OptionsStylesSizes, StylesLang, UserOptions } from '@/types'
import { RESERVED_TYPE_NAMES } from '@/core/types'

export function createOptions(options: UserOptions = {}): { options: Options, logs: { warn: string[] } } {
  const logs: { warn: string[] } = {
    warn: [],
  }
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
      logs.warn.push('Invalid styles lang, fallback to css')
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
      sizes: {
        unit: 'px',
        base: 1,
      },
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

    const stylesSizes: OptionsStylesSizes = {
      unit: options.styles.sizes?.unit || 'px',
      base: options.styles.sizes?.base || 1,
    }

    let lang = options.styles.filename.split('.').pop() as StylesLang | undefined
    if (typeof lang === 'undefined' || !stylesLang.includes(lang)) {
      lang = 'css'
      logs.warn.push('Invalid styles lang, fallback to css')
    }

    styles = {
      filename: options.styles.filename,
      lang,
      include: typeof options.styles.include === 'undefined' ? true : options.styles.include,
      names: stylesNames,
      sizes: stylesSizes,
      callback: options.styles.callback,
    }
  }

  let output: Options['output'] = {
    filename: '[name].[hash][extname]',
    name: 'spritemap.svg',
    use: true,
    view: true,
    hrefAttribute: 'xlink:href',
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
      hrefAttribute:
        typeof options.output.hrefAttribute !== 'undefined'
          ? options.output.hrefAttribute
          : output.hrefAttribute,
    }
  }

  if (typeof options.injectSVGOnDev !== 'undefined')
    logs.warn.push('The "injectSVGOnDev" option is deprecated. Use "injectSvgOnDev" instead.')

  const injectSvgOnDev = options.injectSvgOnDev || options.injectSVGOnDev || false

  // Idify
  let idify: UserOptions['idify'] = name => name

  if (typeof options.idify === 'function')
    idify = options.idify

  const route: OptionsRoute = {
    url: '/__spritemap',
    name: 'spritemap',
  }
  if (typeof options.route === 'string') {
    route.url = options.route
    route.name = route.url.startsWith('/') ? options.route.slice(1) : options.route
  }
  else if (typeof options.route === 'object' && options.route.url) {
    route.url = options.route.url || route.url
    route.name = options.route.name || (route.url.startsWith('/') ? options.route.url.slice(1) : options.route.url)
  }

  if (!route.url.startsWith('/')) {
    logs.warn.push(`Route option ${route.url} should start with a leading slash, automatically added.`)
    route.url = `/${route.url}`
  }

  const gutter = options.gutter || 0

  let types: Options['types'] = false
  if (typeof options.types === 'string')
    types = { filename: options.types, groups: {} }
  else if (typeof options.types === 'object' && options.types !== null)
    types = { filename: options.types.filename, groups: options.types.groups ?? {} }

  if (types) {
    for (const name of Object.keys(types.groups)) {
      if (RESERVED_TYPE_NAMES.includes(name)) {
        logs.warn.push(`Type group "${name}" collides with the reserved type "${name}" and was skipped.`)
        delete types.groups[name]
      }
      else if (!/^[A-Z_$][\w$]*$/i.test(name)) {
        logs.warn.push(`Type group "${name}" is not a valid TypeScript type name and was skipped.`)
        delete types.groups[name]
      }
    }
  }

  const finalOptions = {
    svgo: options.svgo,
    oxvg: options.oxvg,
    output,
    prefix,
    styles,
    types,
    injectSvgOnDev,
    idify,
    route,
    gutter,
  } satisfies Options

  return {
    options: finalOptions,
    logs,
  }
}
