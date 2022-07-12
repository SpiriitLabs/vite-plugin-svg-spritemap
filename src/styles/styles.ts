import svgToMiniDataURI from 'mini-svg-data-uri'
import { Options, Pattern, StylesLang, SvgMapObject } from '../types'
import { readFile } from 'fs'
import { promisify } from 'util'
import { join } from 'path'

interface SvgDataUriMapObject {
  width: number
  height: number
  svgDataUri?: string
}

export abstract class Styles {
  protected svgs: Map<string, SvgDataUriMapObject>
  private options: Options

  constructor(svgs: Map<string, SvgMapObject>, options: Options) {
    this.svgs = new Map()
    svgs.forEach((svg, name) => {
      const svgDataUri = svgToMiniDataURI(svg.source)

      this.svgs.set(name, {
        width: svg.width,
        height: svg.height,
        svgDataUri
      })
    })
    this.options = options
    this.options = options
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
    this.svgs.forEach((svg, name) => {
      spriteMap += `${generator(
        this.options.prefix + name,
        svg,
        index === this.svgs.size
      )}\n`
      index++
    })
    return spriteMap
  }

  private async insert(lang: StylesLang, insert: string): Promise<string> {
    const file = await promisify(readFile)(
      join(__dirname, `/template.${lang}`),
      'utf8'
    )
    return file.replace('//', insert)
  }

  protected abstract _generate(): string

  public async generate(lang: StylesLang): Promise<string> {
    const insert = this._generate()
    return await this.insert(lang, insert)
  }
}
