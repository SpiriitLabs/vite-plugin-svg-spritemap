import { build } from 'vite'
import VitePluginSvgSpritemap from '../../src'
import type { UserOptions } from '../../src/types'
import { getPath } from './path'

export const buildVite = async (
  options: UserOptions,
  path: string | null = null
) => {
  const result = await build({
    root: getPath('./project'),
    plugins: [
      VitePluginSvgSpritemap(
        getPath(path ? path : './project/svg/*.svg'),
        options
      )
    ]
  })
  return result
}
