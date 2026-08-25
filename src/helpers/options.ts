import type { Options, OptionsRoute, OptionsStyles, OptionsStylesSizes, StylesInclude, StylesLang, UserOptions } from '@/types'
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
    let lang = options.styles.split('.').pop()?.toLowerCase() as StylesLang | undefined

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
        variables: 'sprites-variables',
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
      variables: options.styles.names?.variables || 'sprites-variables',
    }

    // two names collide into one declaration, and the second one silently wins:
    // the stylesheet then compiles to nothing rather than failing
    const duplicates = Object.values(stylesNames)
      .filter((name, index, names) => names.indexOf(name) !== index)
    for (const name of new Set(duplicates))
      logs.warn.push(`Duplicate styles name "${name}", each of styles.names must be unique.`)

    const stylesSizes: OptionsStylesSizes = {
      unit: options.styles.sizes?.unit || 'px',
      base: options.styles.sizes?.base || 1,
    }

    let lang = options.styles.filename.split('.').pop()?.toLowerCase() as StylesLang | undefined
    if (typeof lang === 'undefined' || !stylesLang.includes(lang)) {
      lang = 'css'
      logs.warn.push('Invalid styles lang, fallback to css')
    }

    const userInclude = options.styles.include
    let include: OptionsStyles['include'] = true
    if (typeof userInclude !== 'undefined') {
      include = Array.isArray(userInclude)
        // the set drops the duplicate a `['variables', 'data']` pair renames into
        ? [...new Set(userInclude.map((entry): StylesInclude => (entry === 'variables' ? 'data' : entry)))]
        : userInclude

      if (Array.isArray(userInclude) && userInclude.includes('variables'))
        logs.warn.push('Styles include "variables" is now "data", the declarations block a sprite is looked up in, automatically renamed. Icon variables are the `variables` option.')
    }

    // the mixin looks every sprite up in that block, so on its own it cannot compile
    if (Array.isArray(include) && include.includes('mixin') && !include.includes('data')) {
      logs.warn.push('Styles include "mixin" needs "data", the declarations it looks a sprite up in, automatically added.')
      include = [...include, 'data']
    }

    styles = {
      filename: options.styles.filename,
      lang,
      include,
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

  // `??`, not `||`: an explicit `injectSvgOnDev: false` has to beat the
  // deprecated spelling, which is only a fallback
  const injectSvgOnDev = options.injectSvgOnDev ?? options.injectSVGOnDev ?? false

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
    route.url = options.route.url
    route.name = options.route.name || (route.url.startsWith('/') ? options.route.url.slice(1) : options.route.url)
  }

  if (!route.url.startsWith('/')) {
    logs.warn.push(`Route option ${route.url} should start with a leading slash, automatically added.`)
    route.url = `/${route.url}`
  }

  // The dev middleware would answer the site root with the spritemap, leaving
  // the application unreachable, so there is nothing to salvage here
  if (route.url === '/') {
    logs.warn.push(`Route option "/" would serve the spritemap at the site root and hide your application, falling back to "/__spritemap".`)
    route.url = '/__spritemap'
    if (!route.name)
      route.name = 'spritemap'
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

  // `true` and an omitted option both mean the default, as for `svgo` and `oxvg`
  let variables: Options['variables'] = { spritemap: 'preserve' }
  if (options.variables === false) {
    variables = false
  }
  else if (typeof options.variables === 'object' && options.variables !== null) {
    const spritemap = options.variables.spritemap
    if (typeof spritemap !== 'undefined' && spritemap !== 'preserve' && spritemap !== 'resolve')
      logs.warn.push(`Invalid variables.spritemap value "${spritemap}", fallback to "preserve".`)

    variables = { spritemap: spritemap === 'resolve' ? 'resolve' : 'preserve' }
  }
  else if (typeof options.variables !== 'undefined' && options.variables !== true) {
    // `variables: 'resolve'` is the slip worth catching: that string belongs to
    // `variables.spritemap`
    logs.warn.push(`Invalid variables value "${options.variables}", fallback to the default. Pass an object to set \`variables.spritemap\`.`)
  }

  // `null` is what a conditional config hands over (`oxvg: isProd ? jobs : null`).
  // Left as-is it reaches OXVG as "run your own preset", which aborts on a `var()`
  // in a style declaration, and SVGO as a config with no `plugins` to read.
  const svgo = options.svgo ?? undefined
  const oxvg = options.oxvg ?? undefined

  const finalOptions = {
    svgo,
    oxvg,
    output,
    prefix,
    styles,
    types,
    injectSvgOnDev,
    idify,
    route,
    gutter,
    variables,
  } satisfies Options

  return {
    options: finalOptions,
    logs,
  }
}
