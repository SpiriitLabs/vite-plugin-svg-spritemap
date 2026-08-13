import type { Jobs as OxvgConfig } from '@oxvg/napi'
import type { Logger } from 'vite'
import type { Options } from '@/types'
import process from 'node:process'
import { log } from '@helpers/log'
import { defaultDisabledPlugins, styleVariablesDisabledPlugins, variablesDisabledPlugins } from '@helpers/svgo'

/**
 * Get OXVG Options
 *
 * @param oxvgOptions - User supplied OXVG option
 * @param prefix - Sprite id prefix, preserved by `cleanupIds`
 * @param variables - Also drop the jobs that mangle a `var()` in a presentation
 * attribute (`'attribute'`), or the wider set needed for one in a style
 * declaration (`'style'`)
 */
export async function getOptions(oxvgOptions: Options['oxvg'] | undefined, prefix: string, variables?: 'attribute' | 'style'): Promise<OxvgConfig | undefined> {
  const { convertSvgoConfig } = await import('@oxvg/napi')

  // Translate the SVGO default config into jobs so both optimizers behave the same.
  // OXVG reads an omitted job as disabled, so dropping a job is how it gets disabled.
  // An unsupported OXVG converting nothing leaves `{}`, kept as-is on purpose: passing
  // `undefined` would run OXVG's own preset, aborting on `var()` in a style declaration.
  let oxvg: OxvgConfig | undefined = convertSvgoConfig(['preset-default'])
  for (const plugin of Object.keys(defaultDisabledPlugins))
    delete oxvg[plugin as keyof OxvgConfig]

  /* v8 ignore else -- @preserve */
  if (oxvg.cleanupIds)
    oxvg.cleanupIds.preservePrefixes = [prefix]

  if (typeof oxvgOptions === 'object')
    oxvg = oxvgOptions
  else if (oxvgOptions === false)
    oxvg = undefined

  // last, so a user supplied config is covered too. Copied, never mutated.
  if (variables && oxvg) {
    const disabled = variables === 'style' ? styleVariablesDisabledPlugins : variablesDisabledPlugins
    oxvg = { ...oxvg }
    for (const plugin of Object.keys(disabled))
      delete oxvg[plugin as keyof OxvgConfig]
  }

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
    // not ERR_MODULE_NOT_FOUND: installed but no native binding for this platform
    if (error.code !== 'ERR_MODULE_NOT_FOUND') {
      log({ level: 'warn', message: `OXVG could not load its native binding on ${process.platform}-${process.arch} (${error.message}). Icons will not be optimized. Install SVGO as a fallback or set \`oxvg: false\` to silence this warning.`, logger })
    }
    return false
  }
}
