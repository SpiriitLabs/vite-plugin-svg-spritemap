import type { Browser } from 'playwright'
import type { ViteDevServer } from 'vite'
import { readFile, unlink, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import VitePluginSvgSpritemap from '../src/index'
import { getPath } from './helper/path'

let server: ViteDevServer
let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch()

  server = await createServer({
    // any valid user config options, plus `mode` and `configFile`
    configFile: false,
    root: getPath('./fixtures/basic'),
    server: {
      port: 5173,
      watch: {
        ignored: [getPath('./fixtures/basic/dist')], // ignore dist change because of parallized test
      },
    },
    plugins: [
      VitePluginSvgSpritemap([
        getPath('./fixtures/basic/svg/*.svg'),
        getPath('./fixtures/basic/hmr/*.svg'),
      ], {
        styles: getPath('./fixtures/basic/styles/spritemap.css'),
      }),
    ],
  })
  await server.listen()

  return async () => {
    await server.close()
    await browser.close()
  }
})

describe('dev server', () => {
  it('has HMR script', async () => {
    const page = await browser.newPage()
    await page.goto('http://localhost:5173')
    const test
      = '<script type="module" src="/@vite-plugin-svg-spritemap/client"></script>'
    const result = await page.content()
    await page.close()
    expect(result.includes(test)).toBeTruthy()
  })

  it('transforms __spritemap declaration', async () => {
    const page = await browser.newPage()
    await page.goto('http://localhost:5173')
    const result = await page.content()
    await page.close()
    expect(
      /<use xlink:href="\/__spritemap__[^\n\r#\u2028\u2029]*#.*"><\/use>/.test(result),
    ).toBeTruthy()
  })

  it('has route with SVG spritemap', async () => {
    const page = await browser.newPage()
    await page.goto('http://localhost:5173/__spritemap')
    const result = await page.content()
    await page.close()
    expect(result).toMatchSnapshot()
  })

  const hmrVitePath = getPath(`./fixtures/basic/hmr/hmr-vite.svg`)
  const hmrViteName = 'sprite-hmr-vite'
  it('has HMR', async () => {
    try {
      await unlink(hmrVitePath)
    }
    catch {}
    onTestFailed(async () => {
      try {
        await unlink(hmrVitePath)
      }
      catch {}
    })

    const page = await browser.newPage()
    await page.goto('http://localhost:5173')
    const viteLogo = (fill = 'currentColor') =>
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--file-icons" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 510 512"><path fill="${fill}" d="M493.89 58.275L355.178 83.558L379.282 0L186.79 37.718l-2.999 50.64L15.145 58.214C3.53 57.538-3.238 65.879 1.558 77.46l244.056 427.983c5.253 8.575 17.347 8.91 22.65 0L507.575 77.419c5.4-9.676-2.874-21.018-13.685-19.144zm-237 435.435L17.87 74.556l164.993 29.491l-7.778 131.365l67.632-15.608l-18.858 92.344l51.374-15.608l-25.495 123.397c-1.27 8.069 9.241 12.362 14.44.812l150.22-299.792l-74.135 14.308l10.086-34.962l140.91-25.684L256.89 493.71z"></path></svg>`

    // Helper function to wait for CSS to be updated by reading it from the filesystem
    // This avoids Vite's HMR transformation that wraps CSS in JavaScript
    const waitForCssUpdate = async (expectedContent?: string, maxRetries = 20): Promise<string> => {
      const cssPath = getPath('./fixtures/basic/styles/spritemap.css')

      // Wait a bit for Vite to process the file change and write the CSS
      await new Promise(resolve => setTimeout(resolve, 200))

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Read the CSS file directly from the filesystem
          // This bypasses Vite's HMR transformation
          const text = await readFile(cssPath, 'utf-8')

          // If we're looking for specific content, check if it's present
          if (expectedContent && !text.includes(expectedContent)) {
            if (attempt < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 150))
              continue
            }
          }

          return text
        }
        catch (error: any) {
          // File might not exist yet, wait and retry
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 150))
            continue
          }
          throw error
        }
      }

      throw new Error(`Failed to get CSS after ${maxRetries} attempts`)
    }

    // Create test
    await writeFile(hmrVitePath, viteLogo('red'))
    const text = await waitForCssUpdate(hmrViteName)
    expect(text).include(hmrViteName)

    // Update test
    await writeFile(hmrVitePath, viteLogo('#000'))
    const revertText = await waitForCssUpdate(hmrViteName)
    expect(revertText).include(hmrViteName)
    expect(text).not.toBe(revertText)

    // Delete test
    await unlink(hmrVitePath)
    const deleteText = await waitForCssUpdate()
    expect(deleteText).not.include(hmrViteName)

    await page.close()
  })
})
