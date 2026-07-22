import type { RollupOutput } from 'rollup'
import type { ViteDevServer } from 'vite'
import { createServer } from 'vite'
import { describe, expect, it } from 'vitest'
import VitePluginSvgSpritemap from '../src/index'
import { buildVite } from './helpers/build'
import { getPath } from './helpers/path'

function findSpritemap(result: Awaited<ReturnType<typeof buildVite>>) {
  return 'output' in result
    ? (result as RollupOutput).output.find(
        asset => asset.name?.startsWith('spritemap.') && asset.name.endsWith('.svg'),
      )
    : undefined
}

describe('output.hrefAttribute (build)', () => {
  it('defaults to xlink:href', async () => {
    const result = await buildVite({ name: 'hrefAttribute_default' })
    const asset = findSpritemap(result)

    expect(asset).toBeDefined()
    if (asset && 'source' in asset) {
      const source = asset.source.toString()
      expect(source).toContain('<use xlink:href="#')
      expect(source).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"')
      // no bare href attribute
      expect(source).not.toContain('<use href="#')
    }
  })

  it('emits only href when set to "href"', async () => {
    const result = await buildVite({
      name: 'hrefAttribute_href',
      options: { output: { hrefAttribute: 'href' } },
    })
    const asset = findSpritemap(result)

    expect(asset).toBeDefined()
    if (asset && 'source' in asset) {
      const source = asset.source.toString()
      expect(source).toContain('<use href="#')
      // deprecated attribute and its now-unused namespace are gone
      expect(source).not.toContain('xlink:href')
      expect(source).not.toContain('xmlns:xlink')
    }
  })

  it('emits href with an xlink:href fallback when set to "both"', async () => {
    const result = await buildVite({
      name: 'hrefAttribute_both',
      options: { output: { hrefAttribute: 'both' } },
    })
    const asset = findSpritemap(result)

    expect(asset).toBeDefined()
    if (asset && 'source' in asset) {
      const source = asset.source.toString()
      // href first, xlink:href as fallback (MDN order)
      expect(source).toMatch(/<use href="#[^"]*" xlink:href="#[^"]*"/)
      expect(source).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"')
    }
  })
})

describe('output.hrefAttribute (dev server)', { timeout: 60000 }, () => {
  it('serves the spritemap with the href + xlink:href fallback', async () => {
    let server: ViteDevServer | undefined
    try {
      server = await createServer({
        configFile: false,
        root: getPath('./fixtures/basic'),
        optimizeDeps: { noDiscovery: true },
        server: {
          port: 5199,
          watch: { ignored: [getPath('./fixtures/basic/dist')] },
        },
        plugins: [
          VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), {
            output: { hrefAttribute: 'both' },
          }),
        ],
      })
      await server.listen()
      const baseUrl = server.resolvedUrls!.local[0].replace(/\/$/, '')

      // Warm up so buildStart (svgManager.updateAll) has populated the spritemap
      // before we hit the middleware that serves it.
      await fetch(baseUrl)
      const res = await fetch(`${baseUrl}/__spritemap`)
      const text = await res.text()

      expect(res.headers.get('content-type')).toContain('image/svg+xml')
      expect(text).toMatch(/<use href="#[^"]*" xlink:href="#[^"]*"/)
      expect(text).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"')
    }
    finally {
      await server?.close()
    }
  })
})
