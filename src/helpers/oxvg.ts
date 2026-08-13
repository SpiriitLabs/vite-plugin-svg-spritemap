import type { Jobs as OxvgConfig } from '@oxvg/napi'
import type { Logger } from 'vite'
import type { Options } from '@/types'
import process from 'node:process'
import { log } from '@helpers/log'
import { defaultDisabledPlugins } from '@helpers/svgo'
import { STYLE_ELEMENT_RE, VAR_CALL } from '@helpers/variables'

// ---------------------------------------------------------------------------
// `var()` mitigations. OXVG mangles a value it cannot resolve, so an icon
// carrying one is optimized with a reduced set of jobs. This block, its use in
// `getOptions` and `_optimizeConfigVariables`/`_optimizeConfigStyleVariables` in
// SVGManager all exist only for https://github.com/noahbald/oxvg/issues/264 and
// are meant to be deleted together once it is fixed and released.
// ---------------------------------------------------------------------------

const STYLE_ATTRIBUTE_RE = /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi

/**
 * Disabled for icons carrying a `var()`: OXVG reads an unresolvable one as "no
 * stroke", deleting `stroke` and every sibling `stroke-*`. SVGO is unaffected.
 */
export const variablesDisabledPlugins = {
  removeUselessStrokeAndFill: false,
} as const

/**
 * Also disabled when the `var()` sits in a style declaration: these panic on the
 * unresolvable value, which aborts the process (SIGABRT) instead of throwing, so no
 * `try`/`catch` can save the build. Found by running every job of the default preset
 * against a `var()` in each SVG presentation property; the four below are the only ones
 * that abort. Keep it a superset of {@link variablesDisabledPlugins}.
 */
export const styleVariablesDisabledPlugins: Record<string, false> = {
  ...variablesDisabledPlugins,
  convertPathData: false,
  removeHiddenElems: false,
  mergePaths: false,
}

/**
 * A `var()` inside a `style` attribute or a `<style>` element, which OXVG cannot
 * optimize without aborting the process.
 *
 * Deliberately broader than the aborting cases: only a plain or `@media` rule
 * feeds the static computed style and aborts, while `:hover`, `:focus`,
 * `@supports` and `@keyframes` are safe, and telling them apart would mean
 * parsing CSS to avoid a hard crash.
 */
export function hasStyleVariable(source: string): boolean {
  if (!source.includes(VAR_CALL))
    return false

  for (const match of source.matchAll(STYLE_ATTRIBUTE_RE)) {
    if ((match[1] ?? match[2] ?? '').includes(VAR_CALL))
      return true
  }

  for (const match of source.matchAll(STYLE_ELEMENT_RE)) {
    if (match[1].includes(VAR_CALL))
      return true
  }

  return false
}

/**
 * Pick the config `svg` has to be optimized with, given the base one and the two
 * mitigated variants. `attribute` and `style` are undefined outside OXVG, where
 * they would mean "run every job" and take an icon straight into the abort.
 */
export function selectVariablesConfig<Base>(
  svg: string,
  base: Base,
  attribute: OxvgConfig | undefined,
  style: OxvgConfig | undefined,
): Base | OxvgConfig {
  if (!svg.includes(VAR_CALL))
    return base

  const mitigated = hasStyleVariable(svg) ? style : attribute
  return typeof mitigated === 'undefined' ? base : mitigated
}

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
