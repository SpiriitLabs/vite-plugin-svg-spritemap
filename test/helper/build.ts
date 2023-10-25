import { build } from 'vite'
import VitePluginSvgSpritemap from '../../src'
import type { UserOptions } from '../../src/types'
import { getPath } from './path'

export async function buildVite(options: UserOptions, path: string | null = null) {
  const result = await build({
    root: getPath('./fixtures/basic'),
    plugins: [
      VitePluginSvgSpritemap(
        getPath(path || './fixtures/basic/svg/*.svg'),
        options,
      ),
    ],
  })
  return result
}
