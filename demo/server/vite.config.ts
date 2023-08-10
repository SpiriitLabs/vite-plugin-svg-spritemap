import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import VitePluginSvgSpritemap from './../../dist'

export default defineConfig({
  plugins: [
    VitePluginSvgSpritemap('src/icons/*.svg', {
      prefix: 'icon-',
      injectSVGOnDev: true,
    }),
    Inspect(),
  ],
})
