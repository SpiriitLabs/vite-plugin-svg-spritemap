import type { Jobs as OxvgConfig } from '@oxvg/napi'
import type { Logger } from 'vite'
import type { Options } from '../types'

/**
 * Get OXVG Options
 */
export function getOptions(oxvgOptions: Options['oxvg'] | undefined) {
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
export async function getOptimize(logger: Logger) {
  try {
    const { optimise } = await import('@oxvg/napi')
    return optimise
  }
  catch (error: any) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND')
      logger.error(`[vite-plugin-svg-spritemap] Error when loading OXVG: ${error.message}`, { error })
    return false
  }
}
