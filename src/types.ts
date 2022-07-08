import type { OptimizeOptions } from 'svgo'

export type Pattern = string[] | string

export type StyleLangs = 'less' | 'scss' | 'styl' | 'css'

export interface AdvancedOptions {
  svgo?: boolean | OptimizeOptions
  output?: {
    filename?: string
  }
  prefix?: string
  styles?:
    | {
        format: 'data' | 'fragment'
      }
    | boolean
}
