import svgToMiniDataURI from 'mini-svg-data-uri'
import fg from 'fast-glob'
import { Pattern } from '../types'
import { readFile } from 'fs'
import { promisify } from 'util'
import { optimize } from 'svgo'
import { DOMParser } from 'xmldom'

interface SvgMapObject {
  width: number
  height: number
  source: string
}

export abstract class Style {
  protected svgMap: Map<string, SvgMapObject>
  private parser: DOMParser

  constructor(iconsPattern: Pattern) {
    this.svgMap = new Map()
    this.parser = new DOMParser()
    this.fillSvgMap(iconsPattern)
  }

  private async fillSvgMap(iconsPattern: Pattern) {
    const icons = await fg(iconsPattern)
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
    generator: (name: string, svg: SvgMapObject) => string,
    prefix: 'sprite-'
  ): string {
    let spriteMap = ''
    this.svgMap.forEach((svg, name) => {
      spriteMap += `${generator(prefix + name, svg)}\n`
    })
    return spriteMap
  }

  protected async insert(source: string, insert: string): Promise<string> {
    const file = await promisify(readFile)(source, 'utf8')
    return file.replace(/^\/\//g, insert)
  }
}
