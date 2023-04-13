import type { Config } from 'svgo'

export type Pattern = string[] | string

export type StylesLang = 'less' | 'scss' | 'styl' | 'css'

export interface UserOptions {
  svgo?: boolean | Config
  output?:
  | { filename: string; use?: boolean; view?: boolean }
  | string
  | boolean
  prefix?: string
  styles?:
  | {
    filename: string
    lang?: StylesLang
  }
  | string
  | false
}

export interface OptionsOutput {
  filename: string
  use: boolean
  view: boolean
}

export interface OptionsStyles {
  filename: string
  lang: StylesLang
}

export interface Options {
  svgo: Config | false
  styles: OptionsStyles | false
  output: OptionsOutput | false
  prefix: string
}

export interface SvgMapObject {
  width: number
  height: number
  viewBox: number[]
  source: string
}
