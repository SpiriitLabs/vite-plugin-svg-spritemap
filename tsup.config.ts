import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'
import { glob } from 'tinyglobby'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  shims: true,
  dts: true,
  async onSuccess() {
    // Add styles templates for css generation
    const styles = async () => {
      const files = await glob('src/styles/*.(scss|styl|less)')
      for (const file of files)
        await fs.copyFile(file, file.replace('src/styles', 'dist/'))
    }

    Promise.all([
      fs.copyFile(resolve(__dirname, './src/client.d.ts'), resolve(__dirname, 'dist/client.d.ts')),
      styles(),
    ])
  },
})
