import svgToMiniDataURI from 'mini-svg-data-uri'
import { Options, StylesLang, SvgMapObject } from '../types'
import { readFile } from 'fs'
import { promisify } from 'util'
import { join } from 'path'

interface SvgDataUriMapObject {
  width: number
  height: number
  svgDataUri?: string
}

export class Styles {
  private _svgs: Map<string, SvgDataUriMapObject>
  private _options: Options
  private _lang: StylesLang

  constructor(
    svgs: Map<string, SvgMapObject>,
    lang: StylesLang,
    options: Options
  ) {
    this._svgs = new Map()
    this._lang = lang

    svgs.forEach((svg, name) => {
      const svgDataUri = svgToMiniDataURI(svg.source)

      this._svgs.set(name, {
        width: svg.width,
        height: svg.height,
        svgDataUri
      })
    })
    this._options = options
    this._options = options
  }

  protected createSpriteMap(
    generator: (
      name: string,
      svg: SvgDataUriMapObject,
      isLast: boolean
    ) => string
  ): string {
    let spriteMap = ''
    let index = 1
    this._svgs.forEach((svg, name) => {
      spriteMap += `${generator(
        this._options.prefix + name,
        svg,
        index === this._svgs.size
      )}\n`
      index++
    })
    return spriteMap
  }

  private async insert(insert: string): Promise<string> {
    const file = await promisify(readFile)(
      join(__dirname, `/template.${this._lang}`),
      'utf8'
    )
    return file.replace('//', insert)
  }

  // SCSS generation
  private _generate_scss() {
    let insert = '$sprites: (\n'
    insert += this.createSpriteMap((name, svg, isLast) => {
      return `\t'${name}': "${svg.svgDataUri}"${!isLast ? ',' : ''}\n`
    })
    insert += ');\n'

    insert += '$sizes: (\n'
    insert += this.createSpriteMap((name, svg, isLast) => {
      return `\t'${name}': (
                    \t\t'width': ${svg.width}px,\n
                    \t\t'height': ${svg.height}px\n
                \t${!isLast ? '),' : ')'}\n`
    })
    insert += ');\n'

    return insert
  }

  public async generate(): Promise<string> {
    let insert: string
    switch (this._lang) {
      case 'scss':
        insert = this._generate_scss()
        break
      default:
        insert = ''
    }
    return this._lang === 'css'
      ? await new Promise(() => {
          return insert
        })
      : await this.insert(insert)
  }
}
