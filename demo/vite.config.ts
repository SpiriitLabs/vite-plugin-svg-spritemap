import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import VitePluginSvgSpritemap from './../src/index'

export default defineConfig({
  plugins: [
    VitePluginSvgSpritemap('src/icons/*.svg', {
      styles: {
        filename: 'src/scss/spritemap.scss'
      }
      // styles: {
      //   filename: 'src/stylus/spritemap.styl'
      // }
      // styles: {
      //   filename: 'src/less/spritemap.less'
      // }
    }),
    Inspect()
  ]
})
