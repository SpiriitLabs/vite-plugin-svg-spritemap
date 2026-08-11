import type { Page } from 'playwright'
import type { ViteDevServer } from 'vite'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { beforeAll, describe, expect, it } from 'vitest'
import VitePluginSvgSpritemap from '../src/index'
import { getPath } from './helpers/path'

let server: ViteDevServer
let baseUrl: string

beforeAll(async () => {
  server = await createServer({
    configFile: false,
    root: getPath('./fixtures/basic'),
    optimizeDeps: { noDiscovery: true },
    server: {
      // 0 avoids colliding with the other suites' fixed ports
      port: 0,
      watch: {
        ignored: [getPath('./fixtures/basic/dist')],
      },
    },
    plugins: [
      VitePluginSvgSpritemap(getPath('./fixtures/basic/variables/*.svg')),
    ],
  })
  await server.listen()
  baseUrl = server.resolvedUrls!.local[0].replace(/\/$/, '')

  return async () => {
    await server.close()
  }
})

/** Rendered pixels, the only way to observe a `<use>` shadow tree. */
async function shot(page: Page, id: string): Promise<string> {
  return (await page.locator(`#${id}`).screenshot()).toString('base64')
}

/**
 * Render `body` against the dev server, then hand the page to `assert`. The
 * browser is closed straight after: five other suites launch one in parallel,
 * and holding several open is what makes their hooks time out.
 */
async function withPage(body: string, assert: (page: Page) => Promise<void>): Promise<void> {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(baseUrl)
    await page.evaluate(async (html) => {
      // warm the route so the first paint is not an empty reference
      await fetch('/__spritemap')
      document.body.style.background = '#fff'
      document.body.innerHTML = html
    }, body)
    await page.waitForFunction(() => [...document.images].every(image => image.complete))
    await page.waitForTimeout(500)
    await assert(page)
  }
  finally {
    await browser.close()
  }
}

/**
 * The one promise of `variables.spritemap: 'preserve'` only a browser can
 * confirm. Chromium stands in for all of them: firefox and webkit were checked
 * by hand and behave identically.
 */
describe('runtime theming', () => {
  it('themes a <use> but never an <img>', async () => {
    await withPage(`
      <svg id="use-plain" width="24" height="24"><use href="/__spritemap#sprite-themable"></use></svg>
      <svg id="use-themed" width="24" height="24" style="--color: #f00"><use href="/__spritemap#sprite-themable"></use></svg>
      <svg id="use-themed-again" width="24" height="24" style="--color: #f00"><use href="/__spritemap#sprite-themable"></use></svg>
      <img id="img-plain" width="24" height="24" src="/__spritemap#sprite-themable-view">
      <img id="img-themed" width="24" height="24" style="--color: #f00" src="/__spritemap#sprite-themable-view">
    `, async (page) => {
      const [usePlain, useThemed, useThemedAgain, imgPlain, imgThemed] = await Promise.all(
        ['use-plain', 'use-themed', 'use-themed-again', 'img-plain', 'img-themed'].map(id => shot(page, id)),
      )

      // inherited properties cascade into the shadow tree, across documents
      expect(useThemed).not.toBe(usePlain)
      expect(useThemedAgain).toBe(useThemed)
      // an `<img>` is its own document that the page cascade cannot reach
      expect(imgThemed).toBe(imgPlain)
    })
  })

  it('renders the declared default when nothing overrides it', async () => {
    // `themable.svg` declares `fill="var(--color, #fff)"`
    await withPage(`
      <svg id="default" width="24" height="24"><use href="/__spritemap#sprite-themable"></use></svg>
      <svg id="white" width="24" height="24" style="--color: #fff"><use href="/__spritemap#sprite-themable"></use></svg>
    `, async (page) => {
      const [asDefault, asWhite] = await Promise.all(['default', 'white'].map(id => shot(page, id)))

      expect(asDefault).toBe(asWhite)
    })
  })

  it('keeps the var() in the served spritemap', async () => {
    const spritemap = await (await fetch(`${baseUrl}/__spritemap`)).text()

    expect(spritemap).toContain('fill="var(--color, #fff)"')
    expect(spritemap).toContain('stroke-width="var(--weight, 2)"')
  })
})
