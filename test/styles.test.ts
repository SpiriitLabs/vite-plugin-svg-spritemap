import { resolve } from 'path'
import { promises as fs } from 'fs'
import { build, normalizePath } from 'vite'
import { it, describe, expect } from 'vitest'
import VitePluginSvgSpritemap from '../src'

const buildVite = async (style: string) => {
  const filename = normalizePath(
    resolve(__dirname, `./project/styles/spritemap.${style}`)
  )
  await fs.unlink(filename)
  await build({
    root: normalizePath(resolve(__dirname, './project')),
    plugins: [
      VitePluginSvgSpritemap(
        normalizePath(resolve(__dirname, './project/svg/*.svg')),
        {
          styles: filename
        }
      )
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
