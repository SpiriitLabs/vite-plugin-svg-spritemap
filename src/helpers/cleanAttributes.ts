import { svgElementAttributes } from 'svg-element-attributes'

export function cleanAttributes(attributes: Attr[], tag: string): Attr[] {
  const cleanAttributes = ['viewbox', 'width', 'height', 'id', 'xmlns']

  const validAttributes = [
    ...svgElementAttributes['*'],
    ...svgElementAttributes.svg.filter(attr =>
      svgElementAttributes[tag].includes(attr),
    ),
  ]

  return Array.from(attributes).filter(
    attr =>
      !cleanAttributes.includes(attr.name.toLocaleLowerCase())
      && validAttributes.includes(attr.name),
  )
}
