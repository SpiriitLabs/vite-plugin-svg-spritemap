import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default defineConfig({
  plugins: [
    VitePluginSvgSpritemap('./../_fixtures/icons/*.svg', {
      prefix: 'icon-',
      injectSVGOnDev: true,
    }),
    Inspect(),
  ],
})
