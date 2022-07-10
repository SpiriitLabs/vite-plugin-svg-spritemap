import type { OptimizeOptions as SvgoOptimizeOptions } from 'svgo'

export type Pattern = string[] | string

export type StylesLang = 'less' | 'scss' | 'styl' | 'css'
export type StylesFormat = 'auto' | 'data' | 'fragment'

export interface UserOptions {
  svgo?: boolean | SvgoOptimizeOptions
  output?:
    | {
        filename?: string
      }
    | boolean
  prefix?: string
  styles?:
    | {
        format: StylesFormat
      }
    | boolean
}

export interface Options {
  svgo: ((prefix: string) => SvgoOptimizeOptions) | false
  output:
    | {
        filename: string
      }
    | false
  prefix: string
  styles:
    | {
        format: StylesFormat
      }
    | false
}
