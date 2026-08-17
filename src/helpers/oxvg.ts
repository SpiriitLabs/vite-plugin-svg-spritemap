import type { Jobs as OxvgConfig } from '@oxvg/napi'
import type { Logger } from 'vite'
import type { Options } from '@/types'
import process from 'node:process'
import { log } from '@helpers/log'
import { defaultDisabledPlugins } from '@helpers/svgo'
import { VAR_CALL_RE } from '@helpers/variables'

// ---------------------------------------------------------------------------
// `var()` mitigations for https://github.com/noahbald/oxvg/issues/264. This block
// and its call in `SVGManager._optimizeSvg()` are deleted together once it is fixed.
// ---------------------------------------------------------------------------

// left-guarded like `VAR_CALL_RE`: a `\b` matches after a hyphen too, which would
// read `font-style="var(--s, italic)"` as a style declaration
const STYLE_ATTRIBUTE_RE = /(?<![\w-])style\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
// the namespace prefix is optional: `<svg:style>` panics the same way
const STYLE_ELEMENT_RE = /<(?:[\w.-]+:)?style\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?style\s*>/gi

/**
 * Dropped for icons carrying a `var()`: OXVG reads an unresolvable one as "no
 * stroke", deleting `stroke` and every sibling `stroke-*`. SVGO is unaffected.
 */
export const variablesDisabledJobs: readonly string[] = ['removeUselessStrokeAndFill']

/**
 * Also dropped when the `var()` sits in a style declaration: these panic on the
 * unresolvable value, which aborts the process (SIGABRT) instead of throwing, so no
 * `try`/`catch` can save the build. Found by running every job of the default preset
 * against a `var()` in each SVG presentation property, written as a declaration; the
 * three added below are the only other ones that abort. Re-running that sweep needs a
 * fixture each job fires on or it comes back clean, one per job in
 * `test/fixtures/basic/variables-style/`.
 */
export const styleVariablesDisabledJobs: readonly string[] = [
  ...variablesDisabledJobs,
  'convertPathData',
  'removeHiddenElems',
  'mergePaths',
]

/**
 * A `var()` inside a `style` attribute or a `<style>` element, which OXVG cannot
 * optimize without aborting the process.
 *
 * Deliberately broader than the aborting cases, on two counts. Only a plain or
 * `@media` rule feeds the static computed style and aborts, while `:hover`, `:focus`,
 * `@supports` and `@keyframes` are safe, and telling them apart would mean parsing
 * CSS to avoid a hard crash. And unlike `collectVarSites()`, this matches anywhere in
 * the source, so text that merely reads like a declaration counts too. Both cost an
 * icon some optimization, which is the cheap side of the trade.
 */
export function hasStyleVariable(source: string): boolean {
  if (!VAR_CALL_RE.test(source))
    return false

  for (const match of source.matchAll(STYLE_ATTRIBUTE_RE)) {
    if (VAR_CALL_RE.test(match[1] ?? match[2]))
      return true
  }

  for (const match of source.matchAll(STYLE_ELEMENT_RE)) {
    if (VAR_CALL_RE.test(match[1]))
      return true
  }

  return false
}

/** Both stripped copies of a config, derived once for the whole icon set. */
const mitigatedConfigs = new WeakMap<object, { plain: object, style: object }>()

function stripJobs(config: object, disabled: readonly string[]): object {
  const mitigated: Record<string, unknown> = { ...config }
  for (const job of disabled)
    delete mitigated[job]

  return mitigated
}

/**
 * Copy of `config` without the jobs that mangle or abort on the `var()` `svg` carries,
 * the wider set for one in a style declaration. `undefined` stays `undefined`: it means
 * "run OXVG's own preset", which a stripped copy cannot express.
 */
export function withoutVariablesJobs<Config>(svg: string, config: Config): Config {
  if (!config || !VAR_CALL_RE.test(svg))
    return config

  let mitigated = mitigatedConfigs.get(config as object)
  if (typeof mitigated === 'undefined') {
    mitigated = {
      plain: stripJobs(config as object, variablesDisabledJobs),
      style: stripJobs(config as object, styleVariablesDisabledJobs),
    }
    mitigatedConfigs.set(config as object, mitigated)
  }

  return (hasStyleVariable(svg) ? mitigated.style : mitigated.plain) as Config
}

/**
 * Get OXVG Options
 *
 * @param oxvgOptions - User supplied OXVG option
 * @param prefix - Sprite id prefix, preserved by `cleanupIds`
 */
export async function getOptions(oxvgOptions: Options['oxvg'] | undefined, prefix: string): Promise<OxvgConfig | undefined> {
  // a user config is honoured verbatim, so the default one is never built for it
  if (typeof oxvgOptions === 'object')
    return oxvgOptions
  if (oxvgOptions === false)
    return undefined

  const { convertSvgoConfig } = await import('@oxvg/napi')

  // Translate the SVGO default config into jobs so both optimizers behave the same.
  // OXVG reads an omitted job as disabled, so dropping a job is how it gets disabled.
  // An unsupported OXVG converting nothing leaves `{}`, kept as-is on purpose: passing
  // `undefined` would run OXVG's own preset, aborting on `var()` in a style declaration.
  const oxvg: OxvgConfig = convertSvgoConfig(['preset-default'])
  for (const plugin of Object.keys(defaultDisabledPlugins))
    delete oxvg[plugin as keyof OxvgConfig]

  /* v8 ignore else -- @preserve */
  if (oxvg.cleanupIds)
    oxvg.cleanupIds.preservePrefixes = [prefix]

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
