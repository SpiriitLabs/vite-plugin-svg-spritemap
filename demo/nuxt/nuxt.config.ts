// https://nuxt.com/docs/api/configuration/nuxt-config
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: '2025-12-23',
  experimental: {
    viteEnvironmentApi: true,
  },
  vite: {
    plugins: [
      VitePluginSvgSpritemap('./../_fixtures/{icons,flags}/*.svg', {
        // styles: './../_fixtures/icons/spritemap.css',
        styles: './../_fixtures/scss/spritemap.scss',
        // styles: './../_fixtures/icons/spritemap.styl',
        // styles: './../_fixtures/icons/spritemap.less',
        prefix: 'icon-',
        gutter: 20,
        types: {
          filename: './Icons.d.ts',
          groups: {
            UiIcons: './../_fixtures/icons/*.svg',
            Flags: './../_fixtures/flags/*.svg',
          },
        },
      }),
    ],
  },
  css: ['./../_fixtures/scss/style.scss'],
  $development: {
    app: {
      head: {
        script: [
          { src: '/_nuxt/@vite-plugin-svg-spritemap/client', type: 'module' },
        ],
      },
    },
  },
})
