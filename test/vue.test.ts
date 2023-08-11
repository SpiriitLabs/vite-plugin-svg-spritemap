import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ViteDevServer } from 'vite'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
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
    root: getPath('./fixtures/vue'),
    server: {
      port: 3001,
      watch: {
        ignored: [getPath('./fixtures/vue/dist')], // ignore dist change because of parallized test
      },
    },
    plugins: [
      vue(),
      VitePluginSvgSpritemap(getPath('./fixtures/vue/svg/*.svg')),
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

describe('vue components', () => {
  it('has components', async () => {
    await page.goto('http://localhost:3001')
    const result = await page.content()
    expect(result).toMatchSnapshot()
  })
})
