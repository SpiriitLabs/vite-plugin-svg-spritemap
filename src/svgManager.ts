import type { Options, Pattern, SvgMapObject } from './types'
import type { ResolvedConfig } from 'vite'
import { promises as fs } from 'fs'
import { basename, resolve } from 'path'
import fg from 'fast-glob'
import { optimize } from 'svgo'
import { DOMParser, DOMImplementation, XMLSerializer } from '@xmldom/xmldom'
import { Styles } from './styles/styles'
import { calculateY } from './helpers/calculateY'
import { cleanAttributes } from './helpers/cleanAttributes'

export class SVGManager {
  private _options: Options
  private _parser: DOMParser
  private _svgs: Map<string, SvgMapObject>
  private _iconsPattern: Pattern
  private _config: ResolvedConfig

  constructor(iconsPattern: Pattern, options: Options, config: ResolvedConfig) {
    this._parser = new DOMParser()
    this._options = options
    this._svgs = new Map()
    this._iconsPattern = iconsPattern
    this._config = config
  }

  async update(filePath: string, loop: boolean = false) {
    const name = basename(filePath, '.svg')
    if (!name) return false

    let svg: string = await fs.readFile(filePath, 'utf8')
    const document = this._parser.parseFromString(svg, 'image/svg+xml')
    const documentElement = document.documentElement
    let viewbox = (
      documentElement.getAttribute('viewBox') ||
      documentElement.getAttribute('viewbox')
    )
      ?.split(' ')
      .map(a => parseFloat(a))
    const widthAttr = documentElement.getAttribute('width')
    const heightAttr = documentElement.getAttribute('height')
    let width = widthAttr ? parseFloat(widthAttr) : undefined
    let height = heightAttr ? parseFloat(heightAttr) : undefined

    if (viewbox && viewbox.length !== 4 && (!width || !height)) {
      console.log(
        `Sprite '${filePath}}' is invalid, it's lacking both a viewBox and width/height attributes.`
      )
      return
    }
    if (viewbox && viewbox.length !== 4 && width && height) {
      viewbox = [0, 0, width, height]
    }
    if (!width && viewbox) {
      width = viewbox[2]
    }
    if (!height && viewbox) {
      height = viewbox[3]
    }
    if (!width || !height || !viewbox) {
      return
    }

    if (this._options.svgo !== false) {
      const optimizedSvg = optimize(
        svg,
        this._options.svgo(this._options.prefix + name + '-')
      )
      if ('data' in optimizedSvg) {
        svg = optimizedSvg.data
      }
    }

    this._svgs.set(name, {
      width,
      height,
      viewbox,
      source: svg
    })

    if (!loop) {
      await this.createFileStyle()
    }
  }

  async updateAll() {
    const iconsPath = await fg(this._iconsPattern)

    for (let index = 0; index < iconsPath.length; index++) {
      const iconPath = iconsPath[index]
      await this.update(iconPath, true)
    }

    await this.createFileStyle()
  }

  get spritemap() {
    const DOM = new DOMImplementation().createDocument(null, null, null)
    const Serializer = new XMLSerializer()
    const spritemap = DOM.createElement('svg')
    spritemap.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

    // return empty spritemap
    if (!this._svgs.size) return Serializer.serializeToString(spritemap)

    const sizes: { width: number[]; height: number[] } = {
      width: [],
      height: []
    }
    const gutter = 0
    spritemap.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

    const parser = new DOMParser()

    this._svgs.forEach((svg, name) => {
      const symbol = DOM.createElement('symbol')
      const document = parser.parseFromString(svg.source, 'image/svg+xml')
      const documentElement = document.documentElement
      let attributes = cleanAttributes(
        Array.from(documentElement.attributes),
        'symbol'
      )
      attributes.forEach(attr => {
        if (attr.name.toLowerCase().startsWith('xmlns:')) {
          spritemap.setAttribute(attr.name, attr.value)
        }
      })
      attributes.forEach(attr => {
        symbol.setAttribute(attr.name, attr.value)
      })
      symbol.setAttribute('id', this._options.prefix + name)
      symbol.setAttribute('viewBox', svg.viewbox.join(' '))

      Array.from(documentElement.childNodes).forEach(child => {
        symbol.appendChild(child)
      })

      spritemap.appendChild(symbol)
      const y = calculateY(sizes.height, gutter)

      //use
      const use = DOM.createElement('use')
      use.setAttribute('xlink:href', `#${this._options.prefix}${name}`)
      use.setAttribute('width', svg.width.toString())
      use.setAttribute('height', svg.height.toString())
      use.setAttribute('y', y.toString())
      spritemap.appendChild(use)

      //view
      const view = DOM.createElement('view')
      attributes = cleanAttributes(
        Array.from(documentElement.attributes),
        'view'
      )

      attributes.forEach(attr => {
        view.setAttribute(attr.name, attr.value)
      })
      view.setAttribute('id', this._options.prefix + name + '-view')
      view.setAttribute(
        'viewBox',
        `0 ${Math.max(0, y - gutter / 2)} ${svg.width + gutter / 2} ${
          svg.height + gutter / 2
        }`
      )

      spritemap.appendChild(view)
      sizes.width.push(svg.width)
      sizes.height.push(svg.height)
    })

    spritemap.setAttribute(
      'width',
      Math.max.apply(null, sizes.width).toString()
    )
    spritemap.setAttribute(
      'height',
      (
        sizes.height.reduce((a, b) => a + b, 0) +
        (sizes.height.length - 1) * gutter
      ).toString()
    )

    return Serializer.serializeToString(spritemap)
  }

  private async createFileStyle() {
    if (typeof this._options.styles !== 'object') return

    const styleGen: Styles = new Styles(
      this._svgs,
      this._options.styles.lang,
      this._options
    )
    const content = await styleGen.generate()
    const path = resolve(this._config.root, this._options.styles.filename)

    fs.writeFile(path, content, 'utf8')
  }
}
