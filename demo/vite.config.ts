import { defineConfig } from 'vite'
import VitePluginSvgSpritemap from './../src/index'
import Inspect from 'vite-plugin-inspect'

export default defineConfig({
  plugins: [
    VitePluginSvgSpritemap('src/icons/*.svg', {
      // styles: {
      //   filename: 'src/scss/spritemap.scss'
      // }
      // styles: {
      //   filename: 'src/stylus/spritemap.styl'
      // }
      styles: {
        filename: 'src/less/spritemap.less'
      }
    }),
    Inspect()
  ]
})
