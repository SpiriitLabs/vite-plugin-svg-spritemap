import type { SVGManager } from '@core/svgManager'
import type { Jobs as OXVGConfig } from '@oxvg/napi'
import type { Glob } from 'picomatch'
import type { Config as SvgoConfig } from 'svgo'

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type StylesLang = 'less' | 'scss' | 'styl' | 'css'

export interface Shared { svgManager: SVGManager | null, options: Options, routeUrl: string }

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
   * Take an OXVG Options object. If true, it will use the default options from OXVG, if false, it will disable OXVG optimization
   * @see https://github.com/noahbald/oxvg
   */
  oxvg?: boolean | OXVGConfig
  /**
   * Output spritemap options.
   * Set as a string to change the destination of the file. You can use output filename like Rollup (doesn't support hash number).
   * Set to false to disable output generation
   * @default true
   */
  output?: Partial<OptionsOutput> | string | boolean
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
    | (Omit<
      WithOptional<OptionsStyles, 'lang' | 'include' | 'sizes'>,
        'names' | 'sizes'
    > & {
      names?: Partial<OptionsStylesNames>
      sizes?: Partial<OptionsStylesSizes>
    })
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
   * @default '/__spritemap'
   */
  route?: string | Partial<OptionsRoute>
  /**
   * Gutter (in pixels) between each sprite to help prevent overlap
   * @default 0
   */
  gutter?: number
  /**
   * TypeScript type generation. Put the relative file destination to enable, or false to disable.
   * @default false
   */
  types?: TypesOptions
}

export interface TypesConfig {
  /**
   * File destination of the generated type definitions, e.g. `src/types/spritemap.d.ts`.
   */
  filename: string
  /**
   * Map of `TypeName` → glob(s). Each glob is matched against icon file paths
   * and the matching icon ids become a union type named after the key.
   */
  groups?: Record<string, Glob>
}

export type TypesOptions = TypesConfig | string | false

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
  /**
   * Size output configuration for width/height values
   */
  sizes: OptionsStylesSizes
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
          isLast: boolean,
        ) => string,
      ) => string
    },
  ) => string
}

export interface OptionsRoute {
  /**
   * Route name of the spritemap
   * @description Used in logging and styles generation
   * @default 'spritemap'
   */
  name: string
  /**
   * Route url use to serve the spritemap
   * @default '/__spritemap'
   */
  url: string
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

export interface OptionsStylesSizes {
  /**
   * The CSS unit for width/height values
   * @default 'px'
   */
  unit: string
  /**
   * Base value to divide dimensions by (useful for px to em/rem conversion)
   * @default 1
   */
  base: number
}

export interface Options {
  oxvg?: boolean | OXVGConfig
  svgo?: boolean | SvgoConfig
  styles: OptionsStyles | false
  types: { filename: string, groups: Record<string, Glob> } | false
  output: OptionsOutput | false
  prefix: string
  injectSvgOnDev: boolean
  idify: (name: string, svg: Omit<SvgMapObject, 'id'>) => string
  route: OptionsRoute
  gutter: number
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
}

export interface UserOptionsLogs {
  warn: string[]
}
