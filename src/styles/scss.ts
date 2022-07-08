import { Pattern } from '../types'
import { Style } from './style'

export class StyleScss extends Style {
  _generate() {
    let insert = '$sprites: (\n'
    insert += this.createSpriteMap((name, svg, isLast) => {
      return `\t'${name}': "${svg.source}"${!isLast ? ',' : ''}\n`
    })
    insert += ');\n'

    insert += '$sizes: (\n'
    insert += this.createSpriteMap((name, svg, isLast) => {
      return `\t'${name}': (
                    \t\t'width': ${svg.width}px,\n
                    \t\t'height': ${svg.height}px\n
                \t${!isLast ? '),' : ')'}\n`
    })
    insert += ');\n'

    return insert
  }
}
