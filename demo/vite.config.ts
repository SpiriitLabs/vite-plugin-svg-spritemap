import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import VitePluginSvgSpritemap from './../src/index'

export default defineConfig({
  plugins: [
    VitePluginSvgSpritemap('src/icons/*.svg', {
      styles: 'src/scss/spritemap.scss'
      // styles: 'src/stylus/spritemap.styl'
      // styles:'src/less/spritemap.less'
    }),
    Inspect()
  ]
})
