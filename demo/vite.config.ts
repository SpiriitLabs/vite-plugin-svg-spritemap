import { defineConfig } from 'vite'
import VitePluginSvgSpritemap from './../src/index'
import Inspect from 'vite-plugin-inspect'

export default defineConfig({
  plugins: [
    VitePluginSvgSpritemap('src/icons/*.svg', {
      styles: {
        format: 'auto',
        lang: 'scss',
        filename: 'src/scss/spritemap.scss'
      }
      // styles: {
      // 	format: 'auto',
      // 	lang: 'styl',
      // 	filename: 'src/stylus/spritemap.styl'
      // }
      // styles: {
      // 	format: 'auto',
      // 	lang: 'less',
      // 	filename: 'src/less/spritemap.less'
      // }
    }),
    Inspect()
  ]
})
