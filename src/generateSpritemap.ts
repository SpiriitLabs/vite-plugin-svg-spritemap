import mixer, { Image, SpriteSymbol } from 'svg-mixer'
import { optimize } from 'svgo'

class Symbol extends SpriteSymbol {
  constructor(id: string, image: Image) {
    super(id, image)
    this.id = 'sprite-' + this.id
  }
}

export const generateSpritemap = async (icons: string) => {
  const result = await mixer(icons, {
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
    return source.data
  }

  return false
}
