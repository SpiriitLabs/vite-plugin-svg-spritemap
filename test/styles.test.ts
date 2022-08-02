import { resolve } from 'path'
import { build } from 'vite'
import { it, describe, expect } from 'vitest'
import VitePluginSvgSpritemap from '../src'

const buildVite = async (style: string) => {
  await build({
    root: resolve(__dirname, './project'),
    plugins: [
      VitePluginSvgSpritemap(resolve(__dirname, './project/svg/*.svg'), {
        styles: {
          filename: resolve(__dirname, `./project/styles/spritemap.${style}`)
        }
      })
    ]
  })
}

describe('Styles generation', () => {
  for (const style of ['scss', 'less', 'stylus']) {
    it(style, async () => {
      await buildVite('scss')
      expect(true).toBe(true)
    })
  }
})
