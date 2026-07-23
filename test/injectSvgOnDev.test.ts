import type { Browser, Page } from 'playwright'
import type { ViteDevServer } from 'vite'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createOptions } from '../src/helpers/options'
import VitePluginSvgSpritemap from '../src/index'
import { getPath } from './helpers/path'

let server: ViteDevServer
let browser: Browser
let page: Page
// Resolved from the server after it listens. The requested port may already be
// taken (another dev server, Docker, …), in which case Vite falls back to a
// free port — so we navigate to the actual URL instead of a hardcoded one.
let baseUrl: string

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
      port: 3000,
      watch: {
        ignored: [getPath('./fixtures/basic/dist')], // ignore dist change because of parallized test
      },
    },
    plugins: [
      VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), {
        styles: getPath('./fixtures/basic/styles/spritemap.css'),
        injectSvgOnDev: true,
      }),
    ],
  })
  await server.listen()
  // Strip the trailing slash so `${baseUrl}/path` doesn't double up.
  baseUrl = server.resolvedUrls!.local[0].replace(/\/$/, '')

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

describe('injectSvgOnDev', () => {
  it('has SVG injected', async () => {
    await page.goto(baseUrl)
    const wrapper = page.locator('#vite-plugin-svg-spritemap')
    await wrapper.waitFor({ state: 'attached' })
    const content = await wrapper.innerHTML()
    expect(content).toMatchSnapshot()
  })

  // TODO: Do HMR verification
  it.skip('has HMR', async () => {})
})

describe('injectSvgOnDev back-compat', () => {
  it('honors the deprecated injectSVGOnDev casing and warns', () => {
    const { options, logs } = createOptions({ injectSVGOnDev: true })
    expect(options.injectSvgOnDev).toBe(true)
    expect(logs.warn.some(w => w.includes('injectSVGOnDev'))).toBe(true)
  })
})
