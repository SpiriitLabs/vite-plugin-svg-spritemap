import { writeFile } from 'fs/promises'
import { Browser, chromium, Page } from 'playwright'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createServer, ViteDevServer } from 'vite'
import VitePluginSvgSpritemap from '../src/index'
import { getPath } from './helper/path'

let server: ViteDevServer
let browser: Browser
let page: Page

beforeAll(async () => {
  browser = await chromium.launch()

  server = await createServer({
    // any valid user config options, plus `mode` and `configFile`
    configFile: false,
    root: getPath('./project'),
    server: {
      watch: {
        ignored: [getPath('./project/dist')] //ignore dist change because of parallized test
      }
    },
    plugins: [
      VitePluginSvgSpritemap(getPath('./project/svg/*.svg'), {
        styles: getPath('./project/styles/spritemap.css')
      })
    ]
  })
  await server.listen()

  return async () => {
    await server.close()
    await browser.close()
  }
})

beforeEach(async () => {
  page = await browser.newPage()
})

afterEach(async () => {
  await page.close()
})

describe('dev server', () => {
  it('has HMR script', async () => {
    await page.goto('http://localhost:5173')
    const test =
      '<script type="module" src="/@vite-plugin-svg-spritemap/client"></script>'
    const result = await page.content()
    expect(result.includes(test)).toBeTruthy()
  })

  it('transforms __spritemap declaration', async () => {
    await page.goto('http://localhost:5173')
    const result = await page.content()
    expect(
      /<use xlink:href="__spritemap__.*#.*"><\/use>/.test(result)
    ).toBeTruthy()
  })

  it('has route with SVG spritemap', async () => {
    await page.goto('http://localhost:5173/__spritemap')
    const result = await page.content()
    expect(result).toMatchSnapshot()
  })

  it('has HMR', async () => {
    await page.goto('http://localhost:5173')
    const viteLogo = (fill = 'currentColor') =>
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--file-icons" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 510 512"><path fill="${fill}" d="M493.89 58.275L355.178 83.558L379.282 0L186.79 37.718l-2.999 50.64L15.145 58.214C3.53 57.538-3.238 65.879 1.558 77.46l244.056 427.983c5.253 8.575 17.347 8.91 22.65 0L507.575 77.419c5.4-9.676-2.874-21.018-13.685-19.144zm-237 435.435L17.87 74.556l164.993 29.491l-7.778 131.365l67.632-15.608l-18.858 92.344l51.374-15.608l-25.495 123.397c-1.27 8.069 9.241 12.362 14.44.812l150.22-299.792l-74.135 14.308l10.086-34.962l140.91-25.684L256.89 493.71z"></path></svg>`

    await writeFile(getPath('./project/svg/vite.svg'), viteLogo('red'))
    const response = await page.waitForResponse(response =>
      response.url().includes('/spritemap.css')
    )
    const text = await response.text()
    expect(text).toMatchSnapshot()

    await writeFile(getPath('./project/svg/vite.svg'), viteLogo('#000'))
    await page.waitForResponse(response =>
      response.url().includes('/spritemap.css')
    )
  })
})
