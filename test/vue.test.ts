import type { ResolvedConfig } from 'vite'
import type { SVGManager } from '../src/core/svgManager'
import type { Shared, SvgMapObject, UserOptions } from '../src/types'
import vue from '@vitejs/plugin-vue'
import { chromium } from 'playwright'
import { createLogger, createServer } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { logMessage } from '../src/helpers/log'
import { createOptions } from '../src/helpers/options'
import VitePluginSvgSpritemap from '../src/index'
import VuePlugin from '../src/plugins/vue'
import { getPath } from './helpers/path'

// The dev cache-busting hash tracks the fixtures' content, so keep the literal
// value out of assertions while still requiring that a hash is present.
function normalizeHash(html: string) {
  return html.replace(/(__spritemap)__[\w-]+/g, '$1__HASH')
}

async function createVueServer(port: number, options: UserOptions | undefined = undefined, nestVuePlugin = false) {
  const browser = await chromium.launch()
  const server = await createServer({
    configFile: false,
    root: getPath('./fixtures/vue'),
    cacheDir: getPath(`./fixtures/vue/node_modules/.vite-${port}`),
    server: {
      port,
      watch: {
        ignored: [getPath('./fixtures/vue/dist')],
      },
    },
    plugins: [
      // A nested array is a normal shape (presets, conditional plugin lists),
      // and `vite:vue` must still be found inside one.
      nestVuePlugin ? [vue()] : vue(),
      VitePluginSvgSpritemap(getPath('./fixtures/vue/svg/*.svg'), options),
    ],
  })
  await server.listen()
  const page = await browser.newPage()
  // The requested port may already be taken (another dev server, Docker, …),
  // in which case Vite falls back to a free port — so navigate to the actual
  // URL. Strip the trailing slash so `${baseUrl}/path` doesn't double up.
  const baseUrl = server.resolvedUrls!.local[0].replace(/\/$/, '')

  return { server, page, browser, baseUrl }
}

describe('vue components', { timeout: 60000 }, () => {
  it('has components', async () => {
    const { page, server, browser, baseUrl } = await createVueServer(3001)

    await page.goto(baseUrl, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForSelector('#app svg', { timeout: 55000 })

    const result = await page.content()
    expect(normalizeHash(result)).toMatchSnapshot()

    await server.close()
    await browser.close()
  })

  it('detects vue when it is nested inside a plugin array', async () => {
    const { page, server, browser, baseUrl } = await createVueServer(3005, undefined, true)

    await page.goto(baseUrl, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForSelector('#app svg', { timeout: 15000 })
    const result = await page.content()

    await server.close()
    await browser.close()

    expect(normalizeHash(result)).toContain('<use xlink:href="/__spritemap__HASH#sprite-spiriit">')
  })

  it('uses href with an xlink:href fallback on ?use component when output.hrefAttribute is "both"', async () => {
    const { page, server, browser, baseUrl } = await createVueServer(3003, {
      output: {
        hrefAttribute: 'both',
      },
    })

    await page.goto(baseUrl, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForSelector('#app svg', { timeout: 55000 })
    const result = await page.content()

    await server.close()
    await browser.close()

    expect(normalizeHash(result)).toContain('<use href="/__spritemap__HASH#sprite-spiriit" xlink:href="/__spritemap__HASH#sprite-spiriit">')
  })

  it('uses only href on ?use component when output.hrefAttribute is "href"', async () => {
    const { page, server, browser, baseUrl } = await createVueServer(3004, {
      output: {
        hrefAttribute: 'href',
      },
    })

    await page.goto(baseUrl, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForSelector('#app svg', { timeout: 55000 })
    const result = await page.content()

    await server.close()
    await browser.close()

    expect(normalizeHash(result)).toContain('<use href="/__spritemap__HASH#sprite-spiriit">')
    expect(result).not.toContain('xlink:href')
  })

  it('test with warn', async () => {
    const spy = vi.spyOn(console, 'warn')

    const { page, server, browser, baseUrl } = await createVueServer(3002, {
      output: {
        view: false,
      },
    })

    await page.goto(baseUrl, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForSelector('#app svg', { timeout: 55000 })
    const result = await page.content()
    expect(normalizeHash(result)).toMatchSnapshot()

    await server.close()
    await browser.close()

    const calls = spy.mock.calls
    const files = ['spiriit', 'vite']
    for (let index = 0; index < calls.length; index++) {
      const call = calls[index]
      const id = files[index]
      expect(call).toStrictEqual([
        logMessage(`You need to enable the output.view and the output.use option to load ${getPath('./fixtures/vue/svg/')}/${id}.svg?view as component with the ?view query.`),
      ])
    }
  })
})

describe('vue plugin unit', () => {
  const iconPath = getPath('./fixtures/vue/svg/spiriit.svg')

  function svgObject(overrides: Partial<SvgMapObject> = {}): SvgMapObject {
    return { id: 'spiriit', filePath: iconPath, width: 24, height: 24, viewBox: [0, 0, 24, 24], source: '<svg/>', ...overrides }
  }

  function createPlugin(input: { svgs?: Map<string, SvgMapObject>, command?: 'serve' | 'build' } = {}) {
    const { options } = createOptions()
    const svgManager = input.svgs
      ? { svgs: input.svgs, hash: 'testhash' } as unknown as SVGManager
      : null
    const shared: Shared = { options, svgManager, routeUrl: '/__spritemap', routeUrlBase: '/__spritemap' }
    const plugin = VuePlugin(shared) as any
    plugin.configResolved({ command: input.command ?? 'serve', logger: createLogger('silent') } as ResolvedConfig)
    return plugin
  }

  it('does not apply when the config declares no plugins', () => {
    const plugin = createPlugin()
    expect(plugin.apply({}, { command: 'serve', mode: 'development' })).toBe(false)
  })

  it('ignores queries until the manager is ready', async () => {
    const plugin = createPlugin()
    await expect(plugin.load.handler(`${iconPath}?use`)).resolves.toBeUndefined()
  })

  it('ignores files the manager does not know', async () => {
    const plugin = createPlugin({ svgs: new Map() })
    await expect(plugin.load.handler(`${iconPath}?use`)).resolves.toBeUndefined()
  })

  it('bakes the raw route without the dev hash in build', async () => {
    const plugin = createPlugin({ svgs: new Map([[iconPath, svgObject()]]), command: 'build' })
    const code = await plugin.load.handler(`${iconPath}?use`)
    expect(code).toContain('/__spritemap#sprite-spiriit')
    expect(code).not.toContain('testhash')
  })

  it('omits the size attributes on ?view when the svg reports none', async () => {
    const plugin = createPlugin({ svgs: new Map([[iconPath, svgObject({ width: 0, height: 0 })]]) })
    const code = await plugin.load.handler(`${iconPath}?view`)
    expect(code).toContain('/__spritemap__testhash#sprite-spiriit-view')
    expect(code).not.toContain('width')
    expect(code).not.toContain('height')
  })
})
