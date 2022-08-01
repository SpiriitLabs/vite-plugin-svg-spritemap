import { promises as fs } from 'fs'
import { defineConfig } from 'tsup'
import fg from 'fast-glob'

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  format: ['cjs', 'esm'],
  async onSuccess() {
    const files = await fg('src/styles/*.(scss|styl|less)')
    for (const file of files) {
      await fs.copyFile(file, file.replace('src/styles', 'dist/'))
    }
  }
})
