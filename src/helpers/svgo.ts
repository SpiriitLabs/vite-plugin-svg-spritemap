import type { Config as SvgoConfig } from 'svgo'
import type { Options } from '../types'

/**
 * Get SVGO Options
 */
export function getOptions(svgoOptions: Options['svgo'], prefix: string) {
  let svgo: SvgoConfig | false = {
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            removeViewBox: false,
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
  if (typeof svgoOptions === 'object' || svgoOptions === false)
    svgo = svgoOptions

  return svgo
}

/**
 * Get SVGO Optimize function
 */
export async function getOptimize() {
  try {
    const { optimize } = await import('svgo')
    return optimize
  }
  catch {
    return false
  }
}
