import type { Options, OptionsStyles, StylesInclude, StylesLang, SvgDataUriMapObject, SvgMapObject } from '../types'
import { promises } from 'node:fs'
import path from 'node:path'
import { resolvesSpritemap, resolveVariableTokens } from '@helpers/variables'
import svgToMiniDataURI from 'mini-svg-data-uri'

// SVGManager replaces the SvgMapObject on every icon change, so a stale entry
// can never be hit: an edited icon arrives as a new object
const dataUriCache = new WeakMap<SvgMapObject, { svgDataUri: string, svgDataUriTemplate?: string }>()
// raw template.<lang> contents, immutable at runtime
const templateCache = new Map<StylesLang, string>()

export class Styles {
  private _svgs: Map<string, SvgDataUriMapObject>
  private _options: Options
  /** Narrowed once here, so no method has to re-check `styles` is not `false`. */
  private _styles: OptionsStyles
  private _routeUrl: string
  /** Whether to write the defaults map: an all-empty one is dead weight. */
  private _variablesEnabled: boolean

  constructor(svgs: Map<string, SvgMapObject>, options: Options, routeUrl: string) {
    // SVGManager only builds a Styles once `styles` resolved to an object, and it
    // logs whatever this constructor throws
    /* v8 ignore if -- @preserve */
    if (typeof options.styles !== 'object')
      throw new TypeError('Styles needs a resolved styles object.')

    this._svgs = new Map()
    this._options = options
    this._styles = options.styles
    this._routeUrl = routeUrl
    this._variablesEnabled = options.variables !== false
      && [...svgs.values()].some(svg => svg.variables)

    const spritemapResolved = resolvesSpritemap(options.variables)
    // nothing can read a token when no map is written, or when `css` gets no mixin
    const maps = this._stylesForMaps()
    const templatable = this._variablesEnabled && maps !== null && maps.lang !== 'css'

    svgs.forEach((svg, filePath) => {
      let uris = dataUriCache.get(svg)
      if (typeof uris === 'undefined') {
        // a `var()` in a data uri can only ever resolve to its own fallback,
        // which `spritemap: 'resolve'` already baked into the source
        const source = svg.variables && !spritemapResolved
          ? resolveVariableTokens(svg.variables.sourceTemplate, svg.variables.defaults)
          : svg.source

        uris = { svgDataUri: Styles.encodeInnerUrlReferences(svgToMiniDataURI(source)) }
        dataUriCache.set(svg, uris)
      }

      // filled in on demand rather than in the branch above, so a cached entry made
      // for a lang that cannot read a token does not deny it to one that can
      if (templatable && svg.variables && typeof uris.svgDataUriTemplate === 'undefined') {
        // tokenize first: `mini-svg-data-uri` rewrites `#` and shortens colors
        uris.svgDataUriTemplate = Styles.encodeInnerUrlReferences(svgToMiniDataURI(svg.variables.sourceTemplate))
      }

      this._svgs.set(filePath, {
        id: svg.id,
        width: svg.width,
        height: svg.height,
        viewbox: svg.viewBox,
        svgDataUri: uris.svgDataUri,
        svgDataUriTemplate: uris.svgDataUriTemplate,
        variableDefaults: svg.variables?.defaults,
      })
    })
  }

  /**
   * Encode the parentheses of internal `url(...)` references (e.g.
   * `filter="url(#a)"`, `fill="url(#gradient)"`) that survive inside the
   * data URI. `mini-svg-data-uri` keeps these parens literal and percent
   * encodes the `#` to `%23`, which hides the fragment from downstream CSS
   * tooling (Vite's `url()` rewriter, Sass): the leftover `url(%23a)` is then
   * mistaken for an asset reference and rewritten to a file path, corrupting
   * the data URI and breaking compilation. Encoding the parens to `%28`/`%29`
   * removes the `url(` token entirely while still decoding back to a valid
   * `url(#a)` once the browser parses the data URI.
   *
   * @see https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/98
   */
  private static encodeInnerUrlReferences(svgDataUri: string): string {
    return svgDataUri.replace(
      /url\(([^)]*)\)/g,
      (_, reference) => `url%28${reference}%29`,
    )
  }

  private createSpriteMap(
    generator: (
      svg: SvgDataUriMapObject,
      isLast: boolean,
    ) => string,
  ): string {
    let spriteMap = ''
    let index = 1
    this._svgs.forEach((svg) => {
      spriteMap += `${generator(svg, index === this._svgs.size)}\n`
      index++
    })
    return spriteMap
  }

  /** Values come from the svg verbatim, so a quote would end the string early. */
  private static formatVariableValue(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }

  /** `'name': "value"` entries of one sprite, shared by the scss and styl maps. */
  private static formatVariablePairs(svg: SvgDataUriMapObject): string {
    return Object.entries(svg.variableDefaults ?? {})
      .map(([name, value]) => `\n\t\t'${name}': ${Styles.formatVariableValue(value)}`)
      .join(',')
  }

  private formatSize(value: number): string {
    const { unit, base } = this._styles.sizes
    const computedValue = value / base
    return `${computedValue}${unit}`
  }

  private async insert(insert: string): Promise<string> {
    // `include: false` drops everything this class generates, but a callback's
    // return value is the user's own content and is still written
    if (this._styles.include === false && !insert)
      return ''

    let template = ''
    if (this._styles.lang !== 'css' && this._includes('mixin')) {
      const lang = this._styles.lang
      const cached = templateCache.get(lang)
      if (typeof cached !== 'undefined') {
        template = cached
      }
      else {
        const currentDir = import.meta.dirname
        const stylesDir = import.meta.env.STYLES_DIR || '../styles'
        const templatePath = path.join(currentDir, stylesDir, `template.${lang}`)

        template = await promises.readFile(templatePath, 'utf8')
        templateCache.set(lang, template)
      }
    }

    // Apply names/mixins changes
    const findAndReplaceObject: Record<string, string> = {
      mixin: this._styles.names.mixin,
      route: this._routeUrl,
      prefix: this._styles.names.prefix,
      sprites: this._styles.names.sprites,
      variables: this._styles.names.variables,
    }

    for (const [key, value] of Object.entries(findAndReplaceObject)) {
      // split/join replaces every occurrence and treats `$&` in user-supplied
      // names as literal text, unlike `replace` with a string pattern
      template = template.split(`__${key}__`).join(value)
    }

    const doNotEditThisFile = '/* Generated by vite-plugin-svg-spritemap */\n\n'

    return `${doNotEditThisFile + insert}\n${template}`
  }

  /** Whether `styles.include` asks for `entry`. */
  private _includes(entry: StylesInclude): boolean {
    const { include } = this._styles
    return include === true || (include !== false && include.includes(entry))
  }

  /**
   * The maps every preprocessor lang emits, all gated on the `'variables'` entry of
   * `styles.include`: the sass/less/stylus variables, not the icon ones.
   */
  private _stylesForMaps(): OptionsStyles | null {
    return this._includes('variables') ? this._styles : null
  }

  // SCSS generation
  private _generate_scss() {
    const styles = this._stylesForMaps()
    if (!styles)
      return ''

    let insert = `$${styles.names.prefix}: '${this._options.prefix}';\n`

    insert += `$${styles.names.sprites}: (\n`
    insert += this.createSpriteMap((svg, isLast) => {
      let sprite = ''
      sprite = `\t'${svg.id}': (`
      sprite += `\n\t\turi: "${svg.svgDataUri}",`
      if (svg.svgDataUriTemplate)
        sprite += `\n\t\turi-template: "${svg.svgDataUriTemplate}",`
      sprite += `\n\t\twidth: ${this.formatSize(svg.width)},`
      sprite += `\n\t\theight: ${this.formatSize(svg.height)}`
      sprite += `\n\t${!isLast ? '),' : ')'}`
      return sprite
    })
    insert += ');\n'

    // an entry per sprite, empty ones included: the mixin looks every sprite up
    if (this._variablesEnabled) {
      insert += `\n$${styles.names.variables}: (\n`
      insert += this.createSpriteMap((svg, isLast) =>
        `\t'${svg.id}': (${Styles.formatVariablePairs(svg)}\n\t${isLast ? ')' : '),'}`)
      insert += ');\n'
    }

    return insert
  }

  // Styl generation
  private _generate_styl() {
    const styles = this._stylesForMaps()
    if (!styles)
      return ''

    let insert = `$${styles.names.prefix} = '${this._options.prefix}'\n`

    insert += `$${styles.names.sprites} = {\n`
    insert += this.createSpriteMap((svg, isLast) => {
      let sprite = ''
      sprite = `\t'${svg.id}': {`
      sprite += `\n\t\turi: "${svg.svgDataUri}",`
      if (svg.svgDataUriTemplate)
        sprite += `\n\t\turi-template: "${svg.svgDataUriTemplate}",`
      sprite += `\n\t\twidth: ${this.formatSize(svg.width)},`
      sprite += `\n\t\theight: ${this.formatSize(svg.height)}`
      sprite += `\n\t${!isLast ? '},' : '}'}`
      return sprite
    })
    insert += '}\n'

    // an entry per sprite, empty ones included: the mixin looks every sprite up
    if (this._variablesEnabled) {
      insert += `\n$${styles.names.variables} = {\n`
      insert += this.createSpriteMap((svg, isLast) =>
        `\t'${svg.id}': {${Styles.formatVariablePairs(svg)}\n\t${isLast ? '}' : '},'}`)
      insert += '}\n'
    }

    return insert
  }

  // Less generation
  private _generate_less() {
    const styles = this._stylesForMaps()
    if (!styles)
      return ''

    let insert = `@${styles.names.prefix}: '${this._options.prefix}';\n`

    insert += `@${styles.names.sprites}: {\n`
    insert += this.createSpriteMap((svg) => {
      let sprite = ''
      sprite = `\t@${svg.id}: {`
      sprite += `\n\t\turi: "${svg.svgDataUri}";`
      if (svg.svgDataUriTemplate)
        sprite += `\n\t\turi-template: "${svg.svgDataUriTemplate}";`
      sprite += `\n\t\twidth: ${this.formatSize(svg.width)};`
      sprite += `\n\t\theight: ${this.formatSize(svg.height)};`
      sprite += '\n\t};'
      return sprite
    })
    insert += '}\n'

    // the leading count is what tells a lone `'a' 1` pair from a list of pairs,
    // which Less cannot otherwise distinguish
    if (this._variablesEnabled) {
      insert += `\n@${styles.names.variables}: {\n`
      insert += this.createSpriteMap((svg) => {
        const entries = Object.entries(svg.variableDefaults ?? {})
        const pairs = entries.map(([name, value]) => `'${name}' ${Styles.formatVariableValue(value)}`)
        return `\t@${svg.id}: ${[entries.length, ...pairs].join(', ')};`
      })
      insert += '}\n'
    }

    return insert
  }

  // CSS generation
  private _generate_css() {
    let insert = ''

    if (this._includes('bg')) {
      insert = this.createSpriteMap((svg) => {
        const selector = `.${this._options.prefix + svg.id}`
        let sprite = ''
        sprite = `${selector} {`
        sprite += `\n\tbackground: url("${svg.svgDataUri}") center no-repeat;`
        sprite += '\n}'
        return sprite
      })
    }

    if (this._includes('mask')) {
      insert += this.createSpriteMap((svg) => {
        const selector = `.${this._options.prefix + svg.id}-mask`
        let sprite = ''
        sprite = `${selector} {`
        sprite += `\n\tmask: url("${svg.svgDataUri}") center no-repeat;`
        sprite += '\n}'
        return sprite
      })
    }

    if (this._includes('bg-frag')) {
      if (this._options.output && this._options.output.view) {
        insert += this.createSpriteMap((svg) => {
          const selector = `.${this._options.prefix + svg.id}-frag`
          let sprite = ''
          sprite = `${selector} {`
          sprite += `\n\tbackground: url('${this._routeUrl}#${
            this._options.prefix + svg.id
          }-view') center no-repeat;`
          sprite += '\n}'
          return sprite
        })
      }
    }

    return insert
  }

  public async generate(): Promise<string> {
    let insert: string

    switch (this._styles.lang) {
      case 'scss':
        insert = this._generate_scss()
        break
      case 'styl':
        insert = this._generate_styl()
        break
      case 'less':
        insert = this._generate_less()
        break
      case 'css':
      default:
        insert = this._generate_css()
    }

    if (this._styles.callback) {
      insert = this._styles.callback({
        content: insert,
        options: this._options,
        createSpritemap: this.createSpriteMap.bind(this),
      })
    }

    return await this.insert(insert)
  }
}
