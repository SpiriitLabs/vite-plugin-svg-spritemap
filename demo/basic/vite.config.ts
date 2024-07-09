import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default defineConfig({
  // base: '/public/dist',
  build: {
    sourcemap: true,
    manifest: true,
  },
  plugins: [
    VitePluginSvgSpritemap('./../_fixtures/flags/*.svg', {
      route: '__flags',
      styles: './../_fixtures/scss/spritemap-flags.scss',
    }),
    VitePluginSvgSpritemap('./../_fixtures/icons/*.svg', {
      // styles: './../_fixtures/icons/spritemap.css',
      styles: './../_fixtures/scss/spritemap.scss',
      // styles: './../_fixtures/icons/spritemap.styl',
      // styles: './../_fixtures/icons/spritemap.less',
      prefix: 'icon-',
      svgo: false,
      // output: {
      //   use: false,
      //   view: false,
      // },
    }),
    Inspect(),
  ],
})
