import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: resolve(root, 'src') },
      { find: /^@core\/(.*)$/, replacement: resolve(root, 'src/core/$1') },
      { find: /^@helpers\/(.*)$/, replacement: resolve(root, 'src/helpers/$1') },
      { find: /^@plugins\/(.*)$/, replacement: resolve(root, 'src/plugins/$1') },
    ],
  },
  test: {
    coverage: {
      include: ['src/*'],
      exclude: [
        'src/types.ts',
        'src/client.d.ts',
        'src/events.d.ts',
      ],
      reporter: ['lcov'],
    },
  },
})
