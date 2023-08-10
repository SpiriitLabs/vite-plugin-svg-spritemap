import { promises as fs, readFileSync } from 'node:fs'
import { defineConfig } from 'tsup'
import fg from 'fast-glob'

const vueComponent = readFileSync('src/vue.d.ts')

export default defineConfig({
  entry: ['src/index.ts'],
  dts: {
    footer: vueComponent.toString(),
  },
  format: ['cjs', 'esm'],
  async onSuccess() {
    // Add styles templates for css generation
    const styles = async () => {
      const files = await fg('src/styles/*.(scss|styl|less)')
      for (const file of files)
        await fs.copyFile(file, file.replace('src/styles', 'dist/'))
    }

    await styles()
  },
})
