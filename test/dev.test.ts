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
    plugins: [VitePluginSvgSpritemap(getPath('./project/svg/*.svg'), {})]
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
    expect(/<use href="__spritemap__.*#.*"><\/use>/.test(result)).toBeTruthy()
  })

  it('has route with SVG spritemap', async () => {
    await page.goto('http://localhost:5173/__spritemap')
    const result = await page.content()
    expect(result).toMatchSnapshot()
  })
})
