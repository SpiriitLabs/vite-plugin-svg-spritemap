import type { Plugin } from 'vite'
import type { AdvancedOptions, Pattern } from './types'
import { BuildPlugin } from './plugins/build'
import { DevPlugin } from './plugins/dev'

export default function VitePluginSvgSpritemap(
  iconsPattern: Pattern,
  options?: AdvancedOptions
): Plugin[] {
  return [BuildPlugin(iconsPattern, options), DevPlugin(iconsPattern, options)]
}
