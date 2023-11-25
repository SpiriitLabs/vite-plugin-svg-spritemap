import type { InlineConfig } from 'vite'
import { build, mergeConfig } from 'vite'
import VitePluginSvgSpritemap from '../../src'
import type { UserOptions } from '../../src/types'
import { getPath } from './path'

export async function buildVite(
  options: UserOptions,
  path: string | null = null,
  config: InlineConfig = {},
) {
  const defaultConfig: InlineConfig = {
    root: getPath('./fixtures/basic'),
    plugins: [
      VitePluginSvgSpritemap(
        getPath(path || './fixtures/basic/svg/*.svg'),
        options,
      ),
    ],
  }

  return await build(mergeConfig(defaultConfig, config))
}
