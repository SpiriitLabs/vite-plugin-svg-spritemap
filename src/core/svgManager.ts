import type { Jobs as OxvgConfig } from '@oxvg/napi'
import type { Glob } from 'picomatch'
import type { Config as SvgoConfig } from 'svgo'
import type { ResolvedConfig } from 'vite'
import type { Options, SvgMapObject } from '@/types'
import { promises as fs } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { hashContent } from '@helpers/hash'
import { log } from '@helpers/log'
import { getOptimize as getOptimiseOxvg, getOptions as getOptionsOxvg } from '@helpers/oxvg'
import { getOptimize as getOptimizeSvgo, getOptions as getOptionsSvgo } from '@helpers/svgo'
import { DOMImplementation, DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { glob } from 'tinyglobby'
import { Styles } from '@/core/styles'
import { Types } from '@/core/types'
import { calculateY } from '@/helpers/calculateY'
import { cleanAttributes } from '@/helpers/cleanAttributes'

/**
 * Manages SVG files for creating a sprite map
 */
export class SVGManager {
  private _options: Options
  private _parser: DOMParser
  private _ids: Set<string>
  private _svgs: Map<string, SvgMapObject>
  private _iconsPattern: Glob
  private _config: ResolvedConfig
  /** Memoized `_generateSpritemap()` output. `null` means "regenerate". */
  private _spritemap: string | null = null
  /** Cache-busting hash of `_spritemap`. Invalidated alongside it. */
  private _hash: string | null = null
  private _optimizeType: 'svgo' | 'oxvg' | null = null
  private _optimize: Awaited<ReturnType<typeof getOptimizeSvgo | typeof getOptimiseOxvg>> | null = null
  /** Built once alongside `_optimize`, it does not vary per file. */
  private _optimizeConfig: SvgoConfig | OxvgConfig | undefined
  /** Last content written per file, to skip byte-identical rewrites. */
  private _written = new Map<string, string>()
  private _routeUrl: string

  constructor(iconsPattern: Glob, options: Options, config: ResolvedConfig, routeUrl: string) {
    this._parser = new DOMParser()
    this._options = options
    this._ids = new Set()
    this._svgs = new Map()
    this._iconsPattern = iconsPattern
    this._config = config
    this._routeUrl = routeUrl
  }

  /**
   * Update a single SVG file in the spritemap
   * @param filePath - The path of the SVG file to update
   * @param mode - The mode of operation, either 'create' or 'update' (default: 'create')
   * @param loop - Whether this update is part of a bulk update (to optimize performance)
   * @returns True if the SVG file was updated, false otherwise
   */
  async update(filePath: string, mode: 'create' | 'update' = 'create', loop = false): Promise<boolean> {
    const name = basename(filePath, '.svg')
    let svg: string
    try {
      svg = await fs.readFile(filePath, 'utf8')
    }
    catch (error) {
      log({ level: 'error', message: `Failed to read file '${filePath}': ${error}`, logger: this._config.logger })
      return false
    }

    const { width, height, viewBox } = this._extractSvgDimensions(svg, filePath)
    if (!width || !height || !viewBox)
      return false

    if (!loop) {
      await this._initializeOptimizer()
    }

    svg = await this._optimizeSvg(svg)

    const svgData = {
      width,
      height,
      viewBox,
      filePath,
      source: svg,
    }

    const id = this._options.idify(name, svgData)

    if (this._ids.has(id) && mode === 'create') {
      log({ level: 'warn', message: `Sprite '${filePath}' has the same id (${id}) as another sprite.`, logger: this._config.logger })
    }

    this._ids.add(id)
    this._svgs.set(filePath, {
      ...svgData,
      id,
    })
    this._invalidateSpritemap()

    if (!loop) {
      this._sortSvgs()
      await this.createFileStyle()
      await this.createFileTypes()
    }

    return true
  }

  /**
   * Remove a single SVG file from the spritemap
   * @param filePath - The path of the SVG file to remove
   * @returns True if the SVG file was removed, false if it was not found
   */
  async delete(filePath: string): Promise<boolean> {
    const svg = this._svgs.get(filePath)
    if (!svg)
      return false

    this._ids.delete(svg.id)
    this._svgs.delete(filePath)
    this._invalidateSpritemap()
    this._sortSvgs()
    await this.createFileStyle()
    await this.createFileTypes()
    return true
  }

  /**
   * Extract width, height and viewBox from SVG
   * @param svg - The SVG content as a string
   * @param filePath - The path of the SVG file (for logging purposes)
   * @returns An object containing width, height and viewBox (if available)
   */
  private _extractSvgDimensions(svg: string, filePath: string): { width?: number, height?: number, viewBox?: number[] } {
    let document: ReturnType<DOMParser['parseFromString']>
    try {
      document = this._parser.parseFromString(svg, 'image/svg+xml')
    }
    catch (error) {
      log({ level: 'warn', message: `Sprite '${filePath}' could not be parsed and was skipped: ${error}`, logger: this._config.logger })
      return {}
    }
    const documentElement = document.documentElement

    // viewBox values may be separated by whitespace and/or a comma (SVG 1.1 §7.7)
    let viewBox = (
      documentElement?.getAttribute('viewBox')
      || documentElement?.getAttribute('viewbox')
    )
      ?.trim()
      .split(/[\s,]+/)
      .map(a => Number.parseFloat(a))

    const widthAttr = documentElement?.getAttribute('width')
    const heightAttr = documentElement?.getAttribute('height')
    let width = widthAttr ? Number.parseFloat(widthAttr) : undefined
    let height = heightAttr ? Number.parseFloat(heightAttr) : undefined

    const hasUsableViewBox
      = Array.isArray(viewBox) && viewBox.length === 4 && viewBox[2] > 0 && viewBox[3] > 0

    if (!hasUsableViewBox && (!width || !height)) {
      log({ level: 'warn', message: `Sprite '${filePath}' was skipped: it needs a valid viewBox or both width and height attributes.`, logger: this._config.logger })
      return {}
    }

    if (!hasUsableViewBox && width && height)
      viewBox = [0, 0, width, height]

    if (!width && viewBox)
      width = viewBox[2]

    if (!height && viewBox)
      height = viewBox[3]

    return { width, height, viewBox }
  }

  /**
   * Optimize SVG using SVGO or OXVG if available
   * @param svg - The SVG content as a string
   * @returns The optimized SVG content as a string
   */
  private async _optimizeSvg(svg: string): Promise<string> {
    if (this._optimize && this._optimizeType) {
      try {
        const optimizedSvg = this._optimize(svg, this._optimizeConfig)
        if (typeof optimizedSvg === 'string')
          return optimizedSvg
        // OXVG returns a string, SVGO an object with `data`
        /* v8 ignore else -- @preserve */
        if ('data' in optimizedSvg)
          return optimizedSvg.data
      }
      catch (error) {
        log({ level: 'warn', message: `${this._optimizeType.toUpperCase()} optimization failed: ${error}`, logger: this._config.logger })
      }
    }

    return svg
  }

  /**
   * Initialize SVGO optimizer
   */
  private async _initializeOptimizer(): Promise<void> {
    if (this._optimize !== null)
      return

    // Try to load SVGO first, if not available, fallback to OXVG
    if (this._options.svgo !== false)
      this._optimize = await getOptimizeSvgo()
    if (this._optimize) {
      log({ level: 'info', message: `Using SVGO for SVG optimization on ${this._options.route.name}.`, logger: this._config.logger })
      this._optimizeType = 'svgo'
      this._optimizeConfig = getOptionsSvgo(this._options.svgo, this._options.prefix)
    }
    if (this._options.svgo && !this._optimize) {
      log({ level: 'warn', message: `You need to install SVGO to be able to optimize your SVG with it.`, logger: this._config.logger })
    }

    if (this._optimize)
      return

    if (this._options.oxvg !== false)
      this._optimize = await getOptimiseOxvg(this._config.logger)
    if (this._optimize) {
      log({ level: 'info', message: `Using OXVG for SVG optimization on ${this._options.route.name}.`, logger: this._config.logger })
      this._optimizeType = 'oxvg'
      this._optimizeConfig = await getOptionsOxvg(this._options.oxvg, this._options.prefix)
    }
    if (this._options.oxvg && !this._optimize) {
      log({ level: 'warn', message: `You need to install OXVG to be able to optimize your SVG with it.`, logger: this._config.logger })
    }
  }

  /**
   * Update all SVG files in the glob pattern
   * @param mode - The mode of operation, either 'create' or 'update' (default: 'create')
   */
  async updateAll(mode: 'create' | 'update' = 'create'): Promise<void> {
    const iconsPath = await glob(this._iconsPattern, {
      cwd: this._config.root,
      absolute: true,
    })

    if (iconsPath.length === 0) {
      const pattern = Array.isArray(this._iconsPattern)
        ? this._iconsPattern.join(', ')
        : this._iconsPattern
      log({ level: 'warn', message: `No SVG files found for pattern '${pattern}' on route '${this._options.route.name}'. The spritemap will be empty.`, logger: this._config.logger })
    }

    // A second run (a watch rebuild) must not inherit the first one's state:
    // deleted icons would linger and every id would collide with itself.
    this._svgs.clear()
    this._ids.clear()
    this._invalidateSpritemap()

    // Initialize SVGO before parallel processing to avoid race conditions
    await this._initializeOptimizer()

    // Process files in parallel for better performance.
    // Use allSettled so a single failing icon cannot abort the whole batch.
    const results = await Promise.allSettled(
      iconsPath.map(iconPath => this.update(iconPath, mode, true)),
    )
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        log({ level: 'error', message: `Failed to process '${iconsPath[index]}': ${result.reason}`, logger: this._config.logger })
      }
    })
    this._sortSvgs()
    await this.createFileStyle()
    await this.createFileTypes()
  }

  /**
   * The SVG sprite map, memoized. Regenerating re-parses every icon
   */
  get spritemap(): string {
    if (this._spritemap === null)
      this._spritemap = this._generateSpritemap()
    return this._spritemap
  }

  /**
   * Cache-busting token for the dev route, derived from the served spritemap
   */
  public get hash(): string {
    if (this._hash === null)
      this._hash = hashContent(this.spritemap)
    return this._hash
  }

  /**
   * Call after every `_svgs` write, reorders included. Order affects output
   */
  private _invalidateSpritemap(): void {
    this._spritemap = null
    this._hash = null
  }

  /**
   * Generate the SVG sprite map
   */
  private _generateSpritemap(): string {
    const DOM = new DOMImplementation().createDocument(null, '', null)
    const Serializer = new XMLSerializer()
    const spritemap = DOM.createElement('svg')
    spritemap.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

    if (this._options.output && this._options.output.use && this._options.output.hrefAttribute !== 'href')
      spritemap.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

    // return empty spritemap
    if (!this._svgs.size)
      return Serializer.serializeToString(spritemap)

    const sizes: { width: number[], height: number[] } = {
      width: [],
      height: [],
    }
    this._svgs.forEach((svg) => {
      const symbol = DOM.createElement('symbol')
      const document = this._parser.parseFromString(svg.source, 'image/svg+xml')
      const documentElement = document.documentElement
      // svg.source already parsed once, the root element is always there
      /* v8 ignore next 6 -- @preserve */
      let attributes = documentElement
        ? cleanAttributes(
            Array.from(documentElement.attributes),
            'symbol',
          )
        : []

      // spritemap attributes
      // unreachable while cleanAttributes strips namespaced attributes
      /* v8 ignore next 4 -- @preserve */
      attributes.forEach((attr) => {
        if (attr.name.toLowerCase().startsWith('xmlns:'))
          spritemap.setAttribute(attr.name, attr.value)
      })

      // symbol attributes
      attributes.forEach((attr) => {
        symbol.setAttribute(attr.name, attr.value)
      })
      symbol.setAttribute('id', this._options.prefix + svg.id)
      symbol.setAttribute('viewBox', svg.viewBox.join(' '))

      // add childs
      /* v8 ignore else -- @preserve */
      if (documentElement) {
        Array.from(documentElement.childNodes).forEach((child) => {
          symbol.appendChild(child)
        })
      }

      spritemap.appendChild(symbol)
      const y = calculateY(sizes.height, this._options.gutter)

      // use
      if (this._options.output && this._options.output.use) {
        const use = DOM.createElement('use')
        const hrefAttribute = this._options.output.hrefAttribute
        const reference = `#${this._options.prefix + svg.id}`
        if (hrefAttribute !== 'xlink:href')
          use.setAttribute('href', reference)
        if (hrefAttribute !== 'href')
          use.setAttribute('xlink:href', reference)
        use.setAttribute('width', svg.width.toString())
        use.setAttribute('height', svg.height.toString())
        use.setAttribute('y', y.toString())
        spritemap.appendChild(use)
      }

      // view
      if (this._options.output && this._options.output.view) {
        const view = DOM.createElement('view')
        /* v8 ignore next 6 -- @preserve */
        attributes = documentElement
          ? cleanAttributes(
              Array.from(documentElement.attributes),
              'view',
            )
          : []
        attributes.forEach((attr) => {
          view.setAttribute(attr.name, attr.value)
        })
        view.setAttribute('id', `${this._options.prefix + svg.id}-view`)
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

  /**
   * Generate and write CSS styles file
   */
  private async createFileStyle(): Promise<void> {
    if (typeof this._options.styles !== 'object')
      return

    try {
      const styleGen: Styles = new Styles(this._svgs, this._options, this._routeUrl)
      const content = await styleGen.generate()
      const path = resolve(this._config.root, this._options.styles.filename)
      if (this._written.get(path) === content)
        return
      const dir = dirname(path)
      await fs.mkdir(dir, { recursive: true })

      await fs.writeFile(path, content, 'utf8')
      this._written.set(path, content)
    }
    catch (error) {
      log({ level: 'error', message: `Failed to create style file: ${error}`, logger: this._config.logger })
    }
  }

  /**
   * Generate and write TypeScript type definition file
   */
  private async createFileTypes(): Promise<void> {
    if (!this._options.types)
      return

    try {
      const typesGen: Types = new Types(this._svgs, this._options, this._config.root)
      const content = typesGen.generate()
      const path = resolve(this._config.root, this._options.types.filename)
      if (this._written.get(path) === content)
        return
      const dir = dirname(path)

      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(path, content, 'utf8')
      this._written.set(path, content)
    }
    catch (error) {
      log({ level: 'error', message: `Failed to create type file: ${error}`, logger: this._config.logger })
    }
  }

  /**
   * Get all SVG objects
   */
  public get svgs(): Map<string, SvgMapObject> {
    return this._svgs
  }

  /**
   * Get all directories containing SVGs
   */
  public get directories(): Set<string> {
    const directories = new Set<string>()
    this._svgs.forEach((svg) => {
      directories.add(dirname(svg.filePath))
    })
    return directories
  }

  /**
   * Sort the internal SVGs Map alphabetically by file path
   */
  private _sortSvgs(): void {
    const entries = [...this._svgs.entries()]
    entries.sort((a, b) => a[0].localeCompare(b[0]))

    this._svgs.clear()
    for (const [key, value] of entries) {
      this._svgs.set(key, value)
    }
    this._invalidateSpritemap()
  }

  /**
   * Check if an SVG file is already managed
   * @param filePath - The path of the SVG file to check
   * @returns True if the SVG file is managed, false otherwise
   */
  public has(filePath: string): boolean {
    return this._svgs.has(filePath)
  }

  /**
   * Get the icons glob pattern
   * @return The icons glob pattern
   */
  public get iconsPattern(): Glob {
    return this._iconsPattern
  }
}
