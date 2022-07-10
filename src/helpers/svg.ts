import type { Options, Pattern } from '../types'
import { readFile } from 'fs'
import { promisify } from 'util'
import fg from 'fast-glob'
import { optimize } from 'svgo'
import { DOMParser } from '@xmldom/xmldom'

interface SvgMapObject {
  width: number
  height: number
  source: string
}

export const loadSvgs = async (iconsPattern: Pattern, options: Options) => {
  const icons = await fg(iconsPattern)
  const map = new Map<string, SvgMapObject>()
  const parser = new DOMParser()

  for (let index = 0; index < icons.length; index++) {
    const icon = icons[index]
    const name = icon.split('/').pop()?.replace('.svg', '')
    if (!name) continue
    let svg: string = await promisify(readFile)(icon, 'utf8')

    const document = parser.parseFromString(svg, 'image/svg+xml')
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

    if (options.svgo !== false) {
      const optimizedSvg = optimize(
        svg,
        options.svgo(options.prefix + name + '-')
      )
      if (name && 'data' in optimizedSvg) {
        svg = optimizedSvg.data
      }
    }

    map.set(name, {
      width: Number(width),
      height: Number(height),
      source: svg
    })
  }

  return map
}
