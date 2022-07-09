import { loadSvgs } from './helpers/svg'
import type { Options, Pattern } from './types'
// replace xmldom by jsdom
import { DOMParser, DOMImplementation, XMLSerializer } from '@xmldom/xmldom'

//https://bugs.chromium.org/p/chromium/issues/detail?id=109212 and https://bugs.webkit.org/show_bug.cgi?id=105904

export const generateSpritemap = async (
  iconsPattern: Pattern,
  options: Options
) => {
  const svgs = await loadSvgs(iconsPattern, options)
  const DOM = new DOMImplementation().createDocument(null, null, null)
  const Serializer = new XMLSerializer()
  const spritemap = DOM.createElement('svg')
  spritemap.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  // use mode
  // spritemap.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

  if (svgs.size) {
    const parser = new DOMParser()

    svgs.forEach((svg, name) => {
      const symbol = DOM.createElement('symbol')
      const document = parser.parseFromString(svg.source, 'image/svg+xml')
      const documentElement = document.documentElement
      const cleanAttributes = ['viewbox', 'width', 'height', 'id', 'xmlns']
      Array.from(documentElement.attributes)
        .filter(
          attr => !cleanAttributes.includes(attr.name.toLocaleUpperCase())
        )
        .forEach(attr => {
          symbol.setAttribute(attr.name, attr.value)
        })
      symbol.setAttribute('id', options.prefix + name)

      Array.from(documentElement.childNodes).forEach(child => {
        symbol.appendChild(child)
      })

      spritemap.appendChild(symbol)
    })
  }

  // use mode
  // svgs.forEach((svg, name) => {
  //   const use = DOM.createElement('use')
  //   use.setAttribute('xlink:href', `#${options.prefix}${name}`)
  //   spritemap.appendChild(use)
  // })

  return Serializer.serializeToString(spritemap)
}
