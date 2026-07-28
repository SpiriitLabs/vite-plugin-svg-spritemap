import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'

export default defineConfig({
  server: {
    // the page is served by Nitro on :3000, so the HMR client must be told to
    // reach Vite on :5173 instead of defaulting to the page origin
    origin: 'http://localhost:5173',
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
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
        injectSvgOnDev: true,
      },
    ),
    Inspect(),
  ],
})
