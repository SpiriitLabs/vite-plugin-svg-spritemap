import type { Config as SvgoConfig } from 'svgo'
import type { Logger } from 'vite'
import type { Options } from '../types'

/**
 * Get OXVG Options
 */
export function getOptions(oxvgOptions: Options['oxvg'] | undefined) {
  let svgo: SvgoConfig | false = {}
  if (typeof oxvgOptions === 'object' || oxvgOptions === false)
    svgo = oxvgOptions

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
