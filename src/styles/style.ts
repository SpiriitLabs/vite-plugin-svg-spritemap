import svgToMiniDataURI from 'mini-svg-data-uri'
import fg from 'fast-glob'
import { Pattern, StyleLangs } from '../types'
import { readFile } from 'fs'
import { promisify } from 'util'
import { optimize } from 'svgo'
import { DOMParser } from 'xmldom'
import { join } from 'path'

interface SvgMapObject {
  width: number
  height: number
  source: string
}

export abstract class Style {
  protected svgMap: Map<string, SvgMapObject>
  private parser: DOMParser
  private prefix: string
  private iconsPattern: Pattern

  constructor(iconsPattern: Pattern) {
    this.svgMap = new Map()
    this.parser = new DOMParser()
    this.prefix = 'sprite-'
    this.iconsPattern = iconsPattern
  }

  public async fillSvgMap() {
    const icons = await fg(this.iconsPattern)
    for (let index = 0; index < icons.length; index++) {
      const icon = icons[index]
      const svg = await promisify(readFile)(icon, 'utf8')
      const name = icon.split('/').pop()?.replace('.svg', '')
      const optimizedSvg = optimize(svg)
      if (name && 'data' in optimizedSvg) {
        const svgDataUri = svgToMiniDataURI(optimizedSvg.data)
        const document = this.parser.parseFromString(
          optimizedSvg.data,
          'image/svg+xml'
        )
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

        this.svgMap.set(name, {
          width: Number(width),
          height: Number(height),
          source: svgDataUri
        })
      }
    }
  }

  protected createSpriteMap(
    generator: (name: string, svg: SvgMapObject, isLast: boolean) => string
  ): string {
    let spriteMap = ''
    let index = 1
    this.svgMap.forEach((svg, name) => {
      spriteMap += `${generator(
        this.prefix + name,
        svg,
        index === this.svgMap.size
      )}\n`
      index++
    })
    return spriteMap
  }

  private async insert(lang: StyleLangs, insert: string): Promise<string> {
    const file = await promisify(readFile)(
      join(__dirname, `/template.${lang}`),
      'utf8'
    )
    return file.replace('//', insert)
  }

  protected abstract _generate(): string

  public async generate(lang: StyleLangs) {
    await this.fillSvgMap()
    const insert = this._generate()
    return await this.insert(lang, insert)
  }
}
