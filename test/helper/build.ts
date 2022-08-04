import { build } from 'vite'
import { RollupOutput } from 'rollup'
import VitePluginSvgSpritemap from '../../src'
import type { UserOptions } from '../../src/types'
import { getPath } from './path'

export const buildVite = async (options: UserOptions) => {
  const result = await build({
    root: getPath('./project'),
    plugins: [VitePluginSvgSpritemap(getPath('./project/svg/*.svg'), options)]
  })
  return result as RollupOutput
}
