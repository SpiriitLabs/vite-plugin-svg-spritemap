import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    sveltekit(),
    VitePluginSvgSpritemap(
      './../_fixtures/icons/*.svg',
      {
        styles: './../_fixtures/scss/spritemap.scss',
        prefix: 'icon-',
      },
    ),
  ],
})
