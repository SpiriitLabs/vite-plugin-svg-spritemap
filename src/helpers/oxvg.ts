import type { Jobs as OxvgConfig } from '@oxvg/napi'
import type { Logger } from 'vite'
import type { Options } from '../types'
import { log } from './log'

/**
 * Get OXVG Options
 */
export function getOptions(oxvgOptions: Options['oxvg'] | undefined): OxvgConfig | undefined {
  let svgo: OxvgConfig | undefined = {}
  if (typeof oxvgOptions === 'object')
    svgo = oxvgOptions
  else if (oxvgOptions === false)
    svgo = undefined

  return svgo
}

/**
 * Get SVGO Optimize function
 */
export async function getOptimize(logger: Logger): Promise<((svg: string, config?: OxvgConfig | null | undefined) => string) | false> {
  try {
    const { optimise } = await import('@oxvg/napi')
    return optimise
  }
  catch (error: any) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND')
      log({ level: 'error', message: `Error when loading OXVG: ${error.message}`, logger })
    return false
  }
}
