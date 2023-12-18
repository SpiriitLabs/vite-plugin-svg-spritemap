import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ViteDevServer } from 'vite'
import { createServer } from 'vite'
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
    root: getPath('./fixtures/basic'),
    server: {
      port: 3000,
      watch: {
        ignored: [getPath('./fixtures/basic/dist')], // ignore dist change because of parallized test
      },
    },
    plugins: [
      VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), {
        styles: getPath('./fixtures/basic/styles/spritemap.css'),
        injectSVGOnDev: true,
      }),
    ],
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

describe('injectSVGOnDev', () => {
  it('has SVG injected', async () => {
    await page.goto('http://localhost:3000')
    const wrapper = page.locator('#vite-plugin-svg-spritemap')
    await wrapper.waitFor({ state: 'attached' })
    const content = await wrapper.innerHTML()
    expect(content).toMatchSnapshot()
  })

  // TODO: Do HMR verification
  it.skip('has HMR', async () => {})
})
