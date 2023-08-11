import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default defineConfig({
  // build: {
  //   sourcemap: true,
  // },
  plugins: [
    VitePluginSvgSpritemap('src/icons/*.svg', {
      // styles: 'src/css/spritemap.css',
      styles: 'src/scss/spritemap.scss',
      // styles: 'src/stylus/spritemap.styl',
      // styles: 'src/less/spritemap.less',
      prefix: 'icon-',
    }),
    Inspect(),
  ],
})
