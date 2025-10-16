import type { Config as SvgoConfig } from 'svgo'
import type { Options } from '../types'

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
            removeEmptyAttrs: false,
            moveGroupAttrsToElems: false,
            collapseGroups: false,
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
