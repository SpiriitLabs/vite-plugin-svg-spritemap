import { promises as fs } from 'fs'
import { it, describe, expect, afterEach } from 'vitest'
import { getPath } from './helper/path'
import { buildVite } from './helper/build'

// const stylesConfig = {
//   default: false,
//   string: 'spritemap.[hash][extname]',
//   'object with default': {
//     filename: 'spritemap.[hash][extname]',
//     lang: 'css'
//   },
//   'object with only lang': {
//     filename: 'spritemap.[hash][extname]',
//     lang: 'css'
//   }
// }

afterEach(async () => {
  for (const style of ['scss', 'less', 'styl']) {
    const filename = getPath(`./project/styles/spritemap.${style}`)
    let exist = false
    try {
      await fs.access(filename)
      exist = true
    } catch {
      exist = false
    }
    if (exist) {
      await fs.unlink(filename)
    }
  }
})

describe('Styles generation', () => {
  for (const style of ['scss', 'less', 'styl']) {
    it(style, async () => {
      const filename = getPath(`./project/styles/spritemap.${style}`)

      await buildVite({
        styles: filename
      })

      const result = await fs.readFile(filename, 'utf8')
      expect(result).toMatchSnapshot()
    })
  }
})
