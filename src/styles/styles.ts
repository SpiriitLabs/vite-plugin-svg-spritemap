import type { Options, SvgDataUriMapObject, SvgMapObject } from '../types'
import { readFile } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import svgToMiniDataURI from 'mini-svg-data-uri'

export class Styles {
  private _svgs: Map<string, SvgDataUriMapObject>
  private _options: Options

  constructor(svgs: Map<string, SvgMapObject>, options: Options) {
    this._svgs = new Map()
    this._options = options

    svgs.forEach((svg, name) => {
      const svgDataUri = svgToMiniDataURI(svg.source)

      this._svgs.set(name, {
        width: svg.width,
        height: svg.height,
        viewbox: svg.viewBox,
        svgDataUri,
      })
    })
  }

  private createSpriteMap(
    generator: (
      name: string,
      svg: SvgDataUriMapObject,
      isLast: boolean
    ) => string,
  ): string {
    let spriteMap = ''
    let index = 1
    this._svgs.forEach((svg, name) => {
      spriteMap += `${generator(name, svg, index === this._svgs.size)}\n`
      index++
    })
    return spriteMap
  }

  private async insert(insert: string): Promise<string> {
    if (!this._options.styles)
      return ''
    let template
      = this._options.styles.lang === 'css' || this._options.styles.includeMixin === false
        ? ''
        : await promisify(readFile)(
          path.join(__dirname, `/template.${this._options.styles.lang}`),
          'utf8',
        )

    // Apply names/mixins changes
    const findAndReplaceObject: Record<string, string> = {
      mixin: this._options.styles.names.mixin,
      route: this._options.route,
      prefix: this._options.styles.names.prefix,
      sprites: this._options.styles.names.sprites,
    }

    for (const key in findAndReplaceObject) {
      if (Object.prototype.hasOwnProperty.call(findAndReplaceObject, key)) {
        const value = findAndReplaceObject[key]
        template = template.replace(`__${key}__`, value)
      }
    }

    const doNotEditThisFile = '/* Generated by vite-plugin-svg-spritemap */\n\n'

    return `${doNotEditThisFile + insert}\n${template}`
  }

  // SCSS generation
  private _generate_scss() {
    if (!this._options.styles)
      return ''

    let insert = `$${this._options.styles.names.prefix}: '${this._options.prefix}';\n`

    insert += `$${this._options.styles.names.sprites}: (\n`
    insert += this.createSpriteMap((name, svg, isLast) => {
      let sprite = ''
      sprite = `\t'${name}': (`
      sprite += `\n\t\turi: "${svg.svgDataUri}",`
      sprite += `\n\t\twidth: ${svg.width}px,`
      sprite += `\n\t\theight: ${svg.height}px`
      sprite += `\n\t${!isLast ? '),' : ')'}`
      return sprite
    })
    insert += ');\n'

    return insert
  }

  // Styl generation
  private _generate_styl() {
    if (!this._options.styles)
      return ''

    let insert = `$${this._options.styles.names.prefix} = '${this._options.prefix}'\n`

    insert += `$${this._options.styles.names.sprites} = {\n`
    insert += this.createSpriteMap((name, svg, isLast) => {
      let sprite = ''
      sprite = `\t'${name}': {`
      sprite += `\n\t\turi: "${svg.svgDataUri}",`
      sprite += `\n\t\twidth: ${svg.width}px,`
      sprite += `\n\t\theight: ${svg.height}px`
      sprite += `\n\t${!isLast ? '},' : '}'}`
      return sprite
    })
    insert += '}\n'

    return insert
  }

  // Less generation
  private _generate_less() {
    if (!this._options.styles)
      return ''

    let insert = `@${this._options.styles.names.prefix}: '${this._options.prefix}';\n`

    insert += `@${this._options.styles.names.sprites}: {\n`
    insert += this.createSpriteMap((name, svg) => {
      let sprite = ''
      sprite = `\t@${name}: {`
      sprite += `\n\t\turi: "${svg.svgDataUri}";`
      sprite += `\n\t\twidth: ${svg.width}px;`
      sprite += `\n\t\theight: ${svg.height}px;`
      sprite += '\n\t};'
      return sprite
    })
    insert += '}\n'

    return insert
  }

  // CSS generation
  private _generate_css() {
    let insert = this.createSpriteMap((name, svg) => {
      const selector = `.${this._options.prefix}${name}`
      let sprite = ''
      sprite = `${selector} {`
      sprite += `\n\tbackground: url("${svg.svgDataUri}") center no-repeat;`
      sprite += '\n}'
      return sprite
    })

    insert += this.createSpriteMap((name, svg) => {
      const selector = `.${this._options.prefix}${name}-mask`
      let sprite = ''
      sprite = `${selector} {`
      sprite += `\n\tmask: url("${svg.svgDataUri}") center no-repeat;`
      sprite += '\n}'
      return sprite
    })

    if (this._options.output && this._options.output.view) {
      insert += this.createSpriteMap((name) => {
        const selector = `.${this._options.prefix}${name}-frag`
        let sprite = ''
        sprite = `${selector} {`
        sprite += `\n\tbackground: url('/${this._options.route}#${
          this._options.prefix + name
        }-view') center no-repeat;`
        sprite += '\n}'
        return sprite
      })
    }

    return insert
  }

  public async generate(): Promise<string> {
    if (!this._options.styles)
      return ''
    let insert: string

    switch (this._options.styles.lang) {
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

    if (this._options.styles.callback) {
      insert = this._options.styles.callback({
        content: insert,
        options: this._options,
        createSpritemap: this.createSpriteMap.bind(this),
      })
    }

    return await this.insert(insert)
  }
}
