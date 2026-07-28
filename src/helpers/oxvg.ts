import type { Jobs as OxvgConfig } from '@oxvg/napi'
import type { Logger } from 'vite'
import type { Options } from '@/types'
import { log } from '@helpers/log'
import { defaultDisabledPlugins } from '@helpers/svgo'

/**
 * Get OXVG Options
 */
export async function getOptions(oxvgOptions: Options['oxvg'] | undefined, prefix: string): Promise<OxvgConfig | undefined> {
  const { convertSvgoConfig } = await import('@oxvg/napi')

  // Translate the SVGO default config into jobs so both optimizers behave the same.
  // OXVG reads an omitted job as disabled, so dropping a job is how it gets disabled.
  let oxvg: OxvgConfig | undefined = convertSvgoConfig(['preset-default'])
  for (const plugin of Object.keys(defaultDisabledPlugins))
    delete oxvg[plugin as keyof OxvgConfig]

  if (!Object.keys(oxvg).length)
    // OXVG below 0.0.6 converts nothing, leave it to apply its own default preset
    oxvg = undefined
  else if (oxvg.cleanupIds)
    oxvg.cleanupIds.preservePrefixes = [prefix]

  if (typeof oxvgOptions === 'object')
    oxvg = oxvgOptions
  else if (oxvgOptions === false)
    oxvg = undefined

  return oxvg
}

/**
 * Get OXVG Optimize function
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
