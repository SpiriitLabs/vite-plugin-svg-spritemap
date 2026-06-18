import type { Browser } from 'playwright'
import type { ViteDevServer } from 'vite'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { beforeAll, describe, expect, it } from 'vitest'
import VitePluginSvgSpritemap from '../src/index'
import { getPath } from './helpers/path'

let server: ViteDevServer
let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch()

  server = await createServer({
    // any valid user config options, plus `mode` and `configFile`
    configFile: false,
    root: getPath('./fixtures/basic'),
    // Tests don't import npm deps that need pre-bundling; disabling discovery
    // avoids the async esbuild dep-scan racing with server.close() (vite:dep-scan
    // "server is being restarted or closed" noise).
    optimizeDeps: { noDiscovery: true },
    server: {
      port: 5174,
      watch: {
        ignored: [getPath('./fixtures/basic/dist')], // ignore dist change because of parallized test
      },
    },
    plugins: [
      VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg')),
      VitePluginSvgSpritemap(getPath('./fixtures/basic/flags/*.svg'), {
        route: {
          name: 'flags',
          url: '/__flags',
        },
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
  it('has HMR scripts', async () => {
    const page = await browser.newPage()
    await page.goto('http://localhost:5174')
    const testClient
      = '<script type="module" src="/@vite-plugin-svg-spritemap/client"></script>'
    const result = await page.content()
    await page.close()
    expect(result.includes(testClient)).toBeTruthy()
  })

  it('has routes with SVG spritemap', async () => {
    const page = await browser.newPage()
    await page.goto('http://localhost:5174/__spritemap')
    const resultSpritemap = await page.content()
    await page.goto('http://localhost:5174/__flags')
    const resultFlags = await page.content()
    await page.close()
    expect(resultSpritemap).toMatchSnapshot()
    expect(resultFlags).toMatchSnapshot()
  })

  // TODO: add HMR verification
  it.skip('has HMR', async () => {
  })
})
