import type { Browser } from 'playwright'
import type { ViteDevServer } from 'vite'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { beforeAll, describe, expect, it } from 'vitest'
import VitePluginSvgSpritemap from '../src/index'
import { getPath } from './helpers/path'

let server: ViteDevServer
let browser: Browser
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
  // Strip the trailing slash so `${baseUrl}/path` doesn't double up.
  baseUrl = server.resolvedUrls!.local[0].replace(/\/$/, '')

  return async () => {
    await server.close()
    await browser.close()
  }
})

describe('dev server', () => {
  it('has HMR scripts', async () => {
    const page = await browser.newPage()
    await page.goto(baseUrl)
    const testClient
      = '<script type="module" src="/@vite-plugin-svg-spritemap/client"></script>'
    const result = await page.content()
    await page.close()
    expect(result.includes(testClient)).toBeTruthy()
  })

  it('has routes with SVG spritemap', async () => {
    const page = await browser.newPage()
    await page.goto(`${baseUrl}/__spritemap`)
    const resultSpritemap = await page.content()
    await page.goto(`${baseUrl}/__flags`)
    const resultFlags = await page.content()
    await page.close()
    expect(resultSpritemap).toMatchSnapshot()
    expect(resultFlags).toMatchSnapshot()
  })

  it.todo('has HMR')
})

describe('routes sharing a prefix', { sequential: true }, () => {
  let overlapServer: ViteDevServer
  let overlapUrl: string

  beforeAll(async () => {
    overlapServer = await createServer({
      configFile: false,
      root: getPath('./fixtures/basic'),
      logLevel: 'silent',
      optimizeDeps: { noDiscovery: true },
      server: { port: 5195 },
      plugins: [
        // Registered first, and a prefix of the next
        VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg')),
        VitePluginSvgSpritemap(getPath('./fixtures/basic/flags/*.svg'), {
          route: { name: 'flags', url: '/__spritemap-flags' },
        }),
      ],
    })
    await overlapServer.listen()
    overlapUrl = overlapServer.resolvedUrls!.local[0].replace(/\/$/, '')

    return async () => {
      await overlapServer.close()
    }
  })

  it('serves each route its own spritemap', async () => {
    const spritemap = await (await fetch(`${overlapUrl}/__spritemap`)).text()
    const flags = await (await fetch(`${overlapUrl}/__spritemap-flags`)).text()

    expect(spritemap).toContain('sprite-vite')
    expect(spritemap).not.toContain('sprite-CH')
    expect(flags).toContain('sprite-CH')
    expect(flags).not.toContain('sprite-vite')
  })

  it('serves the hash-busted route', async () => {
    const html = await (await fetch(`${overlapUrl}/`)).text()
    const hashed = html.match(/\/__spritemap__[a-f0-9]+/)?.[0]
    expect(hashed).toBeDefined()

    const res = await fetch(`${overlapUrl}${hashed}`)
    expect(res.headers.get('content-type')).toBe('image/svg+xml')
    expect(await res.text()).toContain('sprite-vite')
  })

  it('falls through for paths that only share the route prefix', async () => {
    const res = await fetch(`${overlapUrl}/__spritemap-nope`)
    expect(res.headers.get('content-type')).not.toBe('image/svg+xml')
  })

  it('only answers GET', async () => {
    const res = await fetch(`${overlapUrl}/__spritemap`, { method: 'POST' })
    expect(res.headers.get('content-type')).not.toBe('image/svg+xml')
  })
})
