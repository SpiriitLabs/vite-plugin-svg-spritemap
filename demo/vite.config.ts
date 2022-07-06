import { defineConfig } from 'vite'
import VitePluginSvgSpritemap from './../src/index'
import Inspect from 'vite-plugin-inspect'

export default defineConfig({
  plugins: [
    VitePluginSvgSpritemap({
      icons: 'src/icons/*.svg'
      //   output: 'assets/spritemap.[hash].svg'
    }),
    Inspect()
  ]
})
