import type { OptimizeOptions } from 'svgo'

export type Pattern = string[] | string

export interface AdvancedOptions {
  svgo?: boolean | OptimizeOptions
  output?: {
    filename?: string
  }
}
