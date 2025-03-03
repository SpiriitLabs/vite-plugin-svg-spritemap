import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'

export default defineConfig({
  // base: '/public/dist',
  build: {
    sourcemap: true,
    manifest: true,
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  plugins: [
    VitePluginSvgSpritemap('./../_fixtures/icons/*.svg', {
      // styles: './../_fixtures/icons/spritemap.css',
      styles: {
        filename: './../_fixtures/scss/spritemap.scss',
        variables: true,
      },
      // styles: './../_fixtures/icons/spritemap.styl',
      // styles: './../_fixtures/icons/spritemap.less',
      prefix: 'icon-',
      svgo: false,

      // output: {
      //   use: false,
      //   view: false,
      // },
    }),
    // Multiple instance
    VitePluginSvgSpritemap('./../_fixtures/flags/*.svg', {
      route: '__flags',
      prefix: 'flag-',
      styles: {
        filename: './../_fixtures/scss/spritemap-flags.scss',
        names: {
          prefix: 'flags-prefix',
          sprites: 'flags',
          mixin: 'sprites-flags',
        }
      },
    }),
    Inspect(),
  ],
})
