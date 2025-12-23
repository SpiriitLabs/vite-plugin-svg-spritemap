import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'
import { glob } from 'tinyglobby'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  env: {
    STYLES_DIR: './styles',
  },
  async onSuccess() {
    // Add styles templates for css generation
    const styles = async () => {
      await fs.mkdir('dist/styles', { recursive: true })
      const files = await glob('src/styles/*')
      for (const file of files)
        await fs.copyFile(file, file.replace('src/styles', 'dist/styles'))
    }

    Promise.all([
      fs.copyFile(resolve(import.meta.dirname, './src/client.d.ts'), resolve(import.meta.dirname, 'dist/client.d.ts')),
      fs.copyFile(resolve(import.meta.dirname, './src/events.d.ts'), resolve(import.meta.dirname, 'dist/events.d.ts')),
      styles(),
    ])
  },
})
