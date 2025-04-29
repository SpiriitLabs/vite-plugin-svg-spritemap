// https://nuxt.com/docs/api/configuration/nuxt-config
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: '2025-04-29',
  vite: {
    plugins: [
      VitePluginSvgSpritemap('./../_fixtures/icons/*.svg', {
        // styles: './../_fixtures/icons/spritemap.css',
        styles: './../_fixtures/scss/spritemap.scss',
        // styles: './../_fixtures/icons/spritemap.styl',
        // styles: './../_fixtures/icons/spritemap.less',
        prefix: 'icon-',
        gutter: 20,
      }),
    ],
  },
  css: ['./../_fixtures/scss/style.scss'],

})
