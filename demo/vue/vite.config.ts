import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePluginSvgSpritemap('./../_fixtures/icons/*.svg', {
      // styles: './../_fixtures/icons/spritemap.css',
      styles: './../_fixtures/scss/spritemap.scss',
      // styles: './../_fixtures/icons/spritemap.styl',
      // styles: './../_fixtures/icons/spritemap.less',
      prefix: 'icon-',
      output: {
        view: true,
        use: true,
      },
    }),
  ],
})
