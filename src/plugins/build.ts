import { Options } from '../types'
import type { Plugin } from 'vite'
import { generateSpritemap } from '../generateSpritemap'

export function BuildPlugin(options: Options) {
  return <Plugin>{
    name: 'vite-plugin-svg-spritemap:build',
    apply: 'build',
    enforce: 'post',
    async buildStart() {
      const source = await generateSpritemap(options.icons)
      if (source) {
        this.emitFile({
          type: 'asset',
          name: 'spritemap.svg',
          source
        })
      }
    }
    // Add transform path stripemap.svg to assets
  }
}
