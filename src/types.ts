import type { Config as SvgoConfig } from 'svgo'
import './types.d.ts'

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type Pattern = string[] | string

export type StylesLang = 'less' | 'scss' | 'styl' | 'css'

export interface SvgDataUriMapObject {
  width: number
  height: number
  viewbox: number[]
  svgDataUri?: string
}

export interface UserOptions {
  /**
   * Take an SVGO Options object. If true, it will use the default SVGO preset, if false, it will disable SVGO optimization
   * @see https://github.com/svg/svgo#default-preset
   * @default true
   */
  svgo?: boolean | SvgoConfig
  /**
   * Output spritemap options.
   * Set as a string to change the destination of the file. You can use output filename like Rollup (doesn't support hash number).
   * Set to false to disable output generation
   * @default true
   */
  output?:
    | Partial<OptionsOutput>
    | string
    | boolean
  /**
   * Define the prefix uses for sprite id in symbol/use/view. Set to false to disable the prefix
   * @default 'sprite-'
   */
  prefix?: string | false
  /**
   * Styles generation options. Put the relative file destination or a style object.
   * @default false
   */
  styles?:
    | WithOptional<OptionsStyles, 'lang'>
    | string
    | false
  /**
   * Function allowing to customize the id of each symbol of the spritemap svg.
   * @default name => options.prefix + name
   */
  idify?: (name: string, svg: SvgMapObject) => string
  /**
   * Inject the SVG Spritemap inside the body on dev
   * @default false
   */
  injectSVGOnDev?: boolean
  /**
   * Change the route allowing multiple instance of the plugin
   * @default '__spritemap'
   */
  route?: string
}

export interface OptionsOutput {
  /**
   * The destination of the file. You can use output filename like Rollup. Note: Doesn't support hash number.
   * @see https://www.rollupjs.org/guide/en/#outputassetfilenames
   * @default '[name].[hash][extname]'
   */
  filename: string
  /**
   * The name of file, appear on the manifest key
   * @default spritemap.svg
   */
  name: string
  /**
   * Insert use element in the spritemap
   * @default true
   */
  use: boolean
  /**
   * Insert view element in the spritemap
   * @default true
   */
  view: boolean
}

export interface OptionsStyles {
  /**
   * Filename of the style file
   * @example 'src/scss/spritemap.scss'
   */
  filename: string
  /**
   * The CSS processor language
   */
  lang: StylesLang
}

export interface Options {
  svgo: SvgoConfig | false
  styles: OptionsStyles | false
  output: OptionsOutput | false
  prefix: string | false
  injectSVGOnDev: boolean
  idify: (name: string, svg: SvgMapObject) => string
  route: string
}

export interface SvgMapObject {
  /**
   * The interpreted width attribute of the svg
   */
  width: number
  /**
   * The interpreted height attribute of the svg
   */
  height: number
  /**
   * The interpreted viewbox attribute of the svg
   */
  viewBox: number[]
  /**
   * The filepath of the svg
   */
  filePath: string
  /**
   * The source code of the svg
   */
  source: string
}
