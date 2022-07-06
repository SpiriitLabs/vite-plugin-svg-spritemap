import type { Plugin } from 'vite'
import type { Options } from './types'
import mixer, { Image, SpriteSymbol } from 'svg-mixer'
import { optimize } from 'svgo'

class Symbol extends SpriteSymbol {
  constructor(id: string, image: Image) {
    super(id, image)
    this.id = 'sprite-' + this.id
  }
}

function VitePluginSvgSpritemap(options: Options): Plugin {
  return {
    name: 'vite-plugin-svg-spritemap',
    async buildEnd() {
      const result = await mixer(options.icons, {
        // @ts-ignore Old typing
        symbolClass: Symbol,
        // @ts-ignore Old typing
        spriteConfig: { usages: false }
      })
      const source = optimize(result.content, {
        plugins: [
          {
            name: 'preset-default',
            params: {
              overrides: {
                removeEmptyAttrs: false,
                moveGroupAttrsToElems: false,
                collapseGroups: false,
                removeTitle: false,
                cleanupIDs: false
              }
            }
          }
        ]
      })

      if ('data' in source) {
        this.emitFile({
          type: 'asset',
          name: 'spritemap.svg',
          source: source.data
        })
      }
    }
  }
}

export default VitePluginSvgSpritemap
