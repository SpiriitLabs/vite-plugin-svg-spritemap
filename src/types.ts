import type { Config as SvgoConfig } from 'svgo'
import './types.d.ts'

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type Pattern = string[] | string

export type StylesLang = 'less' | 'scss' | 'styl' | 'css'

export interface SvgDataUriMapObject {
  id: string
  width: number
  height: number
  viewbox: number[]
  svgDataUri?: string
}

export interface UserOptions {
  /**
   * Take an SVGO Options object. If true, it will use the default SVGO preset, if false, it will disable SVGO optimization
   * @see https://github.com/svg/svgo#default-preset
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
    | Omit<WithOptional<OptionsStyles, 'lang' | 'include'>, 'names'> & { names?: Partial<OptionsStylesNames> }
    | string
    | false
  /**
   * Function allowing to customize the id of each symbol of the spritemap svg.
   * @default name => name
   */
  idify?: (name: string, svg: Omit<SvgMapObject, 'id'>) => string
  /**
   * Inject the SVG Spritemap inside the body on dev
   * @default false
   * @deprecated Use injectSvgOnDev instead
   */
  injectSVGOnDev?: boolean
  /**
   * Inject the SVG Spritemap inside the body on dev
   * @default false
   */
  injectSvgOnDev?: boolean
  /**
   * Change the route allowing multiple instance of the plugin
   * @default '__spritemap'
   */
  route?: string
  /**
   * Gutter (in pixels) between each sprite to help prevent overlap
   * @default 0
   */
  gutter?: number
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
  /**
   * Styles includes
   * @default true
   */
  include: boolean | Array<'variables' | 'mixin' | 'bg' | 'mask' | 'bg-frag'>
  /**
   * Names of variables/mixin inside the stylesheet
   */
  names: OptionsStylesNames
  callback?: (
    ctx: {
      /**
       * Content of the generated styles
       */
      content: string
      /**
       * Plugin options
       */
      options: Options
      /**
       * Spritemap helper looping inside svg data through a callback
       */
      createSpritemap: (
        generator: (
          svg: SvgDataUriMapObject,
          isLast: boolean
        ) => string
      ) => string
    }
  ) => string
  /**
   * Enable support for variables support through styles
   * @default false
   * @see https://spiriitlabs.github.io/vite-plugin-svg-spritemap/options/styles.html#styles-variables
   */
  variables?: boolean
}

interface OptionsStylesNames {
  /**
   * @default 'sprites-prefix'
   */
  prefix: string
  /**
   * @default 'sprites'
   */
  sprites: string
  /**
   * @default 'sprite'
   */
  mixin: string
}

export interface Options {
  svgo?: boolean | SvgoConfig
  styles: OptionsStyles | false
  output: OptionsOutput | false
  prefix: string
  injectSvgOnDev: boolean
  idify: (name: string, svg: Omit<SvgMapObject, 'id'>) => string
  route: string
  gutter: number
}

export interface SvgVariable {
  name: string
  attribute: string
  value: string
  /**
   * Untransformed svg to be used for variables styles generations
  */
  svg: string
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
   * ID returned by idify function
   */
  id: string
  /**
   * The source code of the svg
   */
  source: string
  /**
   * SVG variables extracted
   */
  variables: SvgVariable[]
}
