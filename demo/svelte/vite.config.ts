import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    VitePluginSvgSpritemap(
      './../_fixtures/icons/*.svg',
      {
        styles: './../_fixtures/scss/spritemap.scss',
        prefix: 'icon-',
      },
    ),
  ],
})
