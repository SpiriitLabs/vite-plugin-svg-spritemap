import svgToMiniDataURI from 'mini-svg-data-uri'
import fg from 'fast-glob'
import { Options, Pattern, StylesLang } from '../types'
import { readFile } from 'fs'
import { promisify } from 'util'
import { optimize, OptimizedError, OptimizedSvg } from 'svgo'
import { DOMParser } from 'xmldom'
import { join } from 'path'

interface SvgMapObject {
  width: number
  height: number
  svgDataUri?: string
}

export abstract class Styles {
  protected svgMap: Map<string, SvgMapObject>
  private parser: DOMParser
  private options: Options
  private iconsPattern: Pattern

  constructor(iconsPattern: Pattern, options: Options) {
    this.svgMap = new Map()
    this.parser = new DOMParser()
    this.options = options
    this.iconsPattern = iconsPattern
  }

  public async fillSvgMap() {
    const icons = await fg(this.iconsPattern)

    for (let index = 0; index < icons.length; index++) {
      const icon = icons[index]
      let svg: string = await promisify(readFile)(icon, 'utf8')
      const name = icon.split('/').pop()?.replace('.svg', '')
      if (!name) continue
      if (this.options.svgo) {
        const optimizedSvg = optimize(svg, this.options.svgo)
        if (name && 'data' in optimizedSvg) {
          svg = optimizedSvg.data
        }
      }

      const document = this.parser.parseFromString(svg, 'image/svg+xml')
      const documentElement = document.documentElement
      let width = documentElement.getAttribute('width')
      let height = documentElement.getAttribute('height')
      const viewBox = documentElement.getAttribute('viewBox')

      if (viewBox) {
        if (!width) {
          width = viewBox.split(' ')[2]
        }
        if (!height) {
          height = viewBox.split(' ')[3]
        }
      }

      const svgDataUri = svgToMiniDataURI(svg)

      this.svgMap.set(name, {
        width: Number(width),
        height: Number(height),
        svgDataUri
      })
    }
  }

  protected createSpriteMap(
    generator: (name: string, svg: SvgMapObject, isLast: boolean) => string
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
