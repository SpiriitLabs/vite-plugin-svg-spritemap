import { promises as fs } from 'node:fs'
import { basename, resolve } from 'node:path'
import fg from 'fast-glob'
import { optimize } from 'svgo'
import { DOMImplementation, DOMParser, XMLSerializer } from '@xmldom/xmldom'
import hash_sum from 'hash-sum'
import type { ResolvedConfig } from 'vite'
import { Styles } from './styles/styles'
import { calculateY } from './helpers/calculateY'
import { cleanAttributes } from './helpers/cleanAttributes'
import type { Options, Pattern, SvgMapObject } from './types'

export class SVGManager {
  private _options: Options
  private _parser: DOMParser
  private _svgs: Map<string, SvgMapObject>
  private _iconsPattern: Pattern
  private _config: ResolvedConfig
  public hash: string | null = null

  constructor(iconsPattern: Pattern, options: Options, config: ResolvedConfig) {
    this._parser = new DOMParser()
    this._options = options
    this._svgs = new Map()
    this._iconsPattern = iconsPattern
    this._config = config
  }

  async update(filePath: string, loop = false) {
    const name = basename(filePath, '.svg')
    if (!name)
      return false

    let svg: string = await fs.readFile(filePath, 'utf8')
    const document = this._parser.parseFromString(svg, 'image/svg+xml')
    const documentElement = document.documentElement
    let viewBox = (
      documentElement.getAttribute('viewBox')
      || documentElement.getAttribute('viewbox')
    )
      ?.split(' ')
      .map(a => Number.parseFloat(a))
    const widthAttr = documentElement.getAttribute('width')
    const heightAttr = documentElement.getAttribute('height')
    let width = widthAttr ? Number.parseFloat(widthAttr) : undefined
    let height = heightAttr ? Number.parseFloat(heightAttr) : undefined

    if (viewBox && viewBox.length !== 4 && (!width || !height)) {
      this._config.logger.warn(`[vite-plugin-svg-spritemap] Sprite '${filePath}' is invalid, it's lacking both a viewBox and width/height attributes.`)

      return
    }
    if (viewBox && viewBox.length !== 4 && width && height)
      viewBox = [0, 0, width, height]

    if (!width && viewBox)
      width = viewBox[2]

    if (!height && viewBox)
      height = viewBox[3]

    if (!width || !height || !viewBox)
      return

    if (typeof this._options.svgo === 'object') {
      const optimizedSvg = optimize(svg, this._options.svgo)
      if ('data' in optimizedSvg)
        svg = optimizedSvg.data
    }

    this._svgs.set(name, {
      width,
      height,
      viewBox,
      filePath,
      source: svg,
    })

    if (!loop) {
      this.hash = hash_sum(this.spritemap)
      await this.createFileStyle()
    }
  }

  async updateAll() {
    const iconsPath = await fg(this._iconsPattern)

    for (let index = 0; index < iconsPath.length; index++) {
      const iconPath = iconsPath[index]
      await this.update(iconPath, true)
    }

    this.hash = hash_sum(this.spritemap)
    await this.createFileStyle()
  }

  get spritemap() {
    const DOM = new DOMImplementation().createDocument(null, null, null)
    const Serializer = new XMLSerializer()
    const spritemap = DOM.createElement('svg')
    spritemap.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

    if (this._options.output && this._options.output.use)
      spritemap.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

    // return empty spritemap
    if (!this._svgs.size)
      return Serializer.serializeToString(spritemap)

    const sizes: { width: number[], height: number[] } = {
      width: [],
      height: [],
    }
    const parser = new DOMParser()

    this._svgs.forEach((svg, name) => {
      const symbol = DOM.createElement('symbol')
      const document = parser.parseFromString(svg.source, 'image/svg+xml')
      const documentElement = document.documentElement
      let attributes = cleanAttributes(
        Array.from(documentElement.attributes),
        'symbol',
      )

      // spritemap attributes
      attributes.forEach((attr) => {
        // console.log(attr.name, attr.value)
        if (attr.name.toLowerCase().startsWith('xmlns:'))
          spritemap.setAttribute(attr.name, attr.value)
      })

      // symbol attributes
      attributes.forEach((attr) => {
        symbol.setAttribute(attr.name, attr.value)
      })
      symbol.setAttribute('id', this._options.idify(name, svg))
      symbol.setAttribute('viewBox', svg.viewBox.join(' '))

      // add childs
      Array.from(documentElement.childNodes).forEach((child) => {
        symbol.appendChild(child)
      })

      spritemap.appendChild(symbol)
      const y = calculateY(sizes.height)

      // use
      if (this._options.output && this._options.output.use) {
        const use = DOM.createElement('use')
        use.setAttribute('xlink:href', `#${this._options.prefix}${name}`)
        use.setAttribute('width', svg.width.toString())
        use.setAttribute('height', svg.height.toString())
        use.setAttribute('y', y.toString())
        spritemap.appendChild(use)
      }

      // view
      if (this._options.output && this._options.output.view) {
        const view = DOM.createElement('view')
        attributes = cleanAttributes(
          Array.from(documentElement.attributes),
          'view',
        )
        attributes.forEach((attr) => {
          view.setAttribute(attr.name, attr.value)
        })
        view.setAttribute('id', `${this._options.prefix + name}-view`)
        view.setAttribute(
          'viewBox',
          `0 ${Math.max(0, y)} ${svg.width} ${svg.height}`,
        )
        spritemap.appendChild(view)
      }

      sizes.width.push(svg.width)
      sizes.height.push(svg.height)
    })

    return Serializer.serializeToString(spritemap)
  }

  private async createFileStyle() {
    if (typeof this._options.styles !== 'object')
      return
    const styleGen: Styles = new Styles(this._svgs, this._options)
    const content = await styleGen.generate()
    const path = resolve(this._config.root, this._options.styles.filename)

    await fs.writeFile(path, content, 'utf8')
  }

  public get svgs() {
    return this._svgs
  }
}
