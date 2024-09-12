import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'

export default defineConfig({
  build: {
    copyPublicDir: false,
    outDir: 'public',
    manifest: true,
    rollupOptions: {
      // overwrite default .html entry
      input: './src/main.ts',
    },
  },
  plugins: [
    VitePluginSvgSpritemap(
      './../_fixtures/icons/*.svg',
      {
        prefix: 'icon-',
        injectSVGOnDev: true,
      },
    ),
    Inspect(),
  ],
})
