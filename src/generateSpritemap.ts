import mixer, { Image, SpriteSymbol } from 'svg-mixer'
import { optimize, OptimizedError, OptimizedSvg, OptimizeOptions } from 'svgo'
import type { Options, Pattern } from './types'

export const generateSpritemap = async (
  iconsPattern: Pattern,
  options: Options
) => {
  class Symbol extends SpriteSymbol {
    constructor(id: string, image: Image) {
      super(id, image)
      this.id = options.prefix + this.id
    }
  }

  const result = await mixer(iconsPattern, {
    // @ts-ignore Old typing
    symbolClass: Symbol,
    // @ts-ignore Old typing
    spriteConfig: { usages: false }
  })

  let content: string | OptimizedSvg | OptimizedError = result.content

  if (typeof options.svgo === 'object') {
    content = optimize(content, options.svgo)
  }

  if (typeof content === 'string') {
    return content
  } else if ('data' in content) {
    return content.data
  }

  return false
}
