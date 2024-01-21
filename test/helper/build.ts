import type { InlineConfig } from 'vite'
import { build, mergeConfig } from 'vite'
import VitePluginSvgSpritemap from '../../src'
import type { UserOptions } from '../../src/types'
import { getPath } from './path'

export function buildVite(obj: {
  name: string
  options?: UserOptions
  path?: string
  viteConfig?: InlineConfig
}) {
  const { name, options, path, viteConfig } = obj
  const defaultConfig: InlineConfig = {
    root: getPath('./fixtures/basic'),
    build: {
      outDir: getPath(`./fixtures/basic/dist/${name}`),
    },
    plugins: [
      VitePluginSvgSpritemap(
        getPath(path || './fixtures/basic/svg/*.svg'),
        options,
      ),
    ],
  }

  return build(mergeConfig(defaultConfig, viteConfig || {}))
}
