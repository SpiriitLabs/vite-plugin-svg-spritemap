import type { Plugin } from 'vite'
import type { Options } from './types'
import { BuildPlugin } from './plugins/build'
import { DevPlugin } from './plugins/dev'

export default function VitePluginSvgSpritemap(options: Options): Plugin[] {
  return [BuildPlugin(options), DevPlugin(options)]
}
