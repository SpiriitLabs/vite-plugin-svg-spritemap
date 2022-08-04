import { promises as fs } from 'fs'
import { it, describe, expect } from 'vitest'
import { getPath } from './helper/path'
import { buildVite } from './helper/build'

describe('Styles generation', () => {
  for (const style of ['scss', 'less', 'styl']) {
    it(style, async () => {
      const filename = getPath(`./project/styles/spritemap.${style}`)
      await fs.unlink(filename)

      await buildVite({
        styles: filename
      })

      const result = await fs.readFile(filename, 'utf8')
      expect(result).toMatchSnapshot()
    })
  }
})
