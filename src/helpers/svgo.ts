import type { Config as SvgoConfig } from 'svgo'
import type { Options } from '@/types'

/**
 * Plugins of the default preset the spritemap needs disabled.
 * Shared with the OXVG optimizer so both optimizers behave the same.
 */
export const defaultDisabledPlugins = {
  removeEmptyAttrs: false,
  moveGroupAttrsToElems: false,
  collapseGroups: false,
} as const

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
 *
 * @see https://github.com/noahbald/oxvg/issues/264
 */
export const styleVariablesDisabledPlugins: Record<string, false> = {
  ...variablesDisabledPlugins,
  convertPathData: false,
  removeHiddenElems: false,
  mergePaths: false,
}

/**
 * Get SVGO Options
 */
export function getOptions(svgoOptions: Options['svgo'] | undefined, prefix: string): SvgoConfig | undefined {
  let svgo: SvgoConfig | undefined = {
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            ...defaultDisabledPlugins,
            cleanupIds: {
              preservePrefixes: [prefix],
            },
          },
        },
      },
    ],
  }

  if (typeof svgoOptions === 'object')
    svgo = svgoOptions
  else if (svgoOptions === false)
    svgo = undefined

  return svgo
}

/**
 * Get SVGO Optimize function
 */
export async function getOptimize(): Promise<((data: string, config?: SvgoConfig) => { data: string }) | false> {
  try {
    const { optimize } = await import('svgo')
    return optimize
  }
  catch {
    return false
  }
}
