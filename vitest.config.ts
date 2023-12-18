import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      include: ['src/*'],
      exclude: [
        'src/types.ts',
        'src/client.d.ts'
      ],
      reporter: ['lcov'],
    },
  },
})
