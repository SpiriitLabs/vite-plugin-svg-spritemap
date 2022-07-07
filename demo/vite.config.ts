import { defineConfig } from 'vite'
import VitePluginSvgSpritemap from './../src/index'
import Inspect from 'vite-plugin-inspect'

export default defineConfig({
  plugins: [VitePluginSvgSpritemap('src/icons/*.svg'), Inspect()]
})
