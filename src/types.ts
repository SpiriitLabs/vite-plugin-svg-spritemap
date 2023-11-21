import type { Config as SvgoConfig } from 'svgo'
import './types.d.ts'

export type Pattern = string[] | string

export type StylesLang = 'less' | 'scss' | 'styl' | 'css'

export interface UserOptions {

  svgo?: boolean | SvgoConfig
  output?:
    | { filename: string, name?: string, use?: boolean, view?: boolean }
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
  injectSVGOnDev?: boolean
}

export interface OptionsOutput {
  filename: string
  name: string
  use: boolean
  view: boolean
}

export interface OptionsStyles {
  filename: string
  lang: StylesLang
}

export interface Options {
  svgo: SvgoConfig | false
  styles: OptionsStyles | false
  output: OptionsOutput | false
  prefix: string
  injectSVGOnDev: boolean
}

export interface SvgMapObject {
  width: number
  height: number
  viewBox: number[]
  source: string
}
