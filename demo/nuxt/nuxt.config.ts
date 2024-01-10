// https://nuxt.com/docs/api/configuration/nuxt-config
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default defineNuxtConfig({
  devtools: { enabled: true },
  vite: {
    plugins: [
      VitePluginSvgSpritemap('./assets/icons/*.svg'),
    ],
  },
  css: ['@/assets/style.scss'],

})
