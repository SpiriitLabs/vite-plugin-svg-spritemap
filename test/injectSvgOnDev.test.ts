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
    root: getPath('./project'),
    server: {
      watch: {
        ignored: [getPath('./project/dist')], // ignore dist change because of parallized test
      },
    },
    plugins: [
      VitePluginSvgSpritemap(getPath('./project/svg/*.svg'), {
        styles: getPath('./project/styles/spritemap.css'),
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
    await page.goto('http://localhost:5173')
    const wrapper = page.locator('#vite-plugin-svg-spritemap svg')
    await wrapper.waitFor({ state: 'attached' })
    const content = await wrapper.innerHTML()
    expect(content).toMatchSnapshot()
  })
})
