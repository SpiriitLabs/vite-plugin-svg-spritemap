import type { UserOptions } from '../src/types'
import vue from '@vitejs/plugin-vue'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { logMessage } from '../src/helpers/log'
import VitePluginSvgSpritemap from '../src/index'
import { getPath } from './helpers/path'

async function createVueServer(port: number, options: UserOptions | undefined = undefined) {
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
      vue(),
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
    expect(result).toMatchSnapshot()

    await server.close()
    await browser.close()
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

    expect(result).toContain('<use href="/__spritemap#sprite-spiriit" xlink:href="/__spritemap#sprite-spiriit">')
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

    expect(result).toContain('<use href="/__spritemap#sprite-spiriit">')
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
    expect(result).toMatchSnapshot()

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
