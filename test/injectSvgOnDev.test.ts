import type { Browser, Page } from 'playwright'
import type { ViteDevServer } from 'vite'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { afterEach, beforeAll, beforeEach, describe, expect, it, onTestFailed, vi } from 'vitest'
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

// Own HMR dir, `dev.test.ts` uses `hmr/` in parallel
const hmrInjectDir = getPath('./fixtures/basic/hmr-inject')
const hmrInjectPath = getPath('./fixtures/basic/hmr-inject/hmr-inject.svg')

beforeAll(async () => {
  browser = await chromium.launch()
  await mkdir(hmrInjectDir, { recursive: true })
  // a leftover from a crashed run would leak into the snapshot
  try {
    await unlink(hmrInjectPath)
  }
  catch {}

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
      VitePluginSvgSpritemap([
        getPath('./fixtures/basic/svg/*.svg'),
        getPath('./fixtures/basic/hmr-inject/*.svg'),
      ], {
        // own file, `dev.test.ts` asserts on `spritemap.css` in parallel
        styles: getPath('./fixtures/basic/styles/spritemap-inject.css'),
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

  it('sends the spritemap through HMR updates', async () => {
    try {
      await unlink(hmrInjectPath)
    }
    catch {}
    onTestFailed(async () => {
      try {
        await unlink(hmrInjectPath)
      }
      catch {}
    })

    const send = vi.spyOn(server.environments.client.hot, 'send')
    await writeFile(hmrInjectPath, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>')

    await vi.waitFor(() => {
      const update = send.mock.calls
        .map(([payload]) => payload)
        .find((payload): payload is Extract<typeof payload, { type: 'custom' }> =>
          typeof payload === 'object' && payload !== null && 'event' in payload
          && payload.event === 'vite-plugin-svg-spritemap:update')

      expect(update).toBeDefined()
      expect(update!.data.spritemap).toContain('sprite-hmr-inject')
    }, { timeout: 10000 })

    send.mockRestore()
    await unlink(hmrInjectPath)
  })
})

describe('injectSvgOnDev back-compat', () => {
  it('honors the deprecated injectSVGOnDev casing and warns', () => {
    const { options, logs } = createOptions({ injectSVGOnDev: true })
    expect(options.injectSvgOnDev).toBe(true)
    expect(logs.warn.some(w => w.includes('injectSVGOnDev'))).toBe(true)
  })
})
