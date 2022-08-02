import { resolve } from 'path'
import { promises as fs } from 'fs'
import { build } from 'vite'
import { it, describe, expect } from 'vitest'
import VitePluginSvgSpritemap from '../src'

const buildVite = async (style: string) => {
  const filename = resolve(__dirname, `./project/styles/spritemap.${style}`)
  await fs.writeFile(filename, '')
  await build({
    root: resolve(__dirname, './project'),
    plugins: [
      VitePluginSvgSpritemap(resolve(__dirname, './project/svg/*.svg'), {
        styles: filename
      })
    ]
  })
  return fs.readFile(filename, 'utf8')
}

describe('Styles generation', () => {
  for (const style of ['scss', 'less', 'styl']) {
    it(style, async () => {
      const result = await buildVite(style)
      expect(result).toMatchSnapshot()
    })
  }
})
