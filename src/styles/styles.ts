import svgToMiniDataURI from 'mini-svg-data-uri'
import { Options, Pattern, StylesLang } from '../types'
import { readFile } from 'fs'
import { promisify } from 'util'
import { join } from 'path'
import { loadSvgs } from '../helpers/svg'

interface SvgDataUriMapObject {
  width: number
  height: number
  svgDataUri?: string
}

export abstract class Styles {
  protected svgMap: Map<string, SvgDataUriMapObject>
  private options: Options
  private iconsPattern: Pattern

  constructor(iconsPattern: Pattern, options: Options) {
    this.svgMap = new Map()
    this.options = options
    this.iconsPattern = iconsPattern
    this.options = options
  }

  public async fillSvgMap() {
    const svgs = await loadSvgs(this.iconsPattern, this.options)

    svgs.forEach((svg, name) => {
      const svgDataUri = svgToMiniDataURI(svg.source)

      this.svgMap.set(name, {
        width: svg.width,
        height: svg.height,
        svgDataUri
      })
    })
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
    this.svgMap.forEach((svg, name) => {
      spriteMap += `${generator(
        this.options.prefix + name,
        svg,
        index === this.svgMap.size
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
    await this.fillSvgMap()
    const insert = this._generate()
    return await this.insert(lang, insert)
  }
}
