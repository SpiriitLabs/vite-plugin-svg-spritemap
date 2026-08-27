import type { Browser } from 'playwright'
import type { UserOptions } from '../src/types'
import { promises as fs } from 'node:fs'
import { chromium } from 'playwright'
import { build, createServer } from 'vite'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import VitePluginSvgSpritemap from '../src'
import { logMessage } from '../src/helpers/log'
import { getPath } from './helpers/path'

let browser: Browser

const routeConfigs: Record<
  string,
  { value: UserOptions['route'], expected: string }
> = {
  default: {
    value: undefined,
    expected: '/__spritemap',
  },
  string: {
    value: '/__spritemap',
    expected: '/__spritemap',
  },
  object: {
    value: {
      name: 'flags',
      url: '/__flags',
    },
    expected: '/__flags',
  },
  object_with_only_name: {
    value: {
      name: 'icons',
    },
    expected: '/__spritemap',
  },
  object_with_only_url: {
    value: {
      url: '/__icons',
    },
    expected: '/__icons',
  },
  string_without_leading_slash: {
    value: '__spritemap',
    expected: '/__spritemap',
  },
  object_without_leading_slash: {
    value: {
      name: 'icons',
      url: '__icons',
    },
    expected: '/__icons',
  },
}

beforeAll(async () => {
  browser = await chromium.launch()

  return async () => {
    await browser.close()
  }
})

describe('route options', { sequential: true }, () => {
  const spy = vi.spyOn(console, 'warn')
  const entries = Object.entries(routeConfigs)
  let port = 5175
  for (let index = 0; index < entries.length; index++) {
    const [key, route] = entries[index]
    if (Object.hasOwn(routeConfigs, key)) {
      it(key, async () => {
        port += index
        const routeValue = typeof route.value === 'string' ? route.value : route.value?.url
        const shouldMockConsoleWarn = routeValue && !routeValue.startsWith('/')

        const page = await browser.newPage()
        const server = await createServer({
          configFile: false,
          root: getPath('./fixtures/basic'),
          // Tests don't import npm deps that need pre-bundling; disabling
          // discovery avoids the async esbuild dep-scan racing with
          // server.close() (vite:dep-scan "server is being restarted" noise).
          optimizeDeps: { noDiscovery: true },
          server: {
            port,
          },
          plugins: [
            VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), {
              route: route.value,
            }),
          ],
        })
        await server.listen()
        const baseUrl = server.resolvedUrls!.local[0].replace(/\/$/, '')
        await page.goto(`${baseUrl}${route.expected}`)

        const result = await page.content()
        expect(result).toContain('<svg')

        if (shouldMockConsoleWarn) {
          const call = spy.mock.calls.findIndex(call => call.includes(
            logMessage(`Route option ${routeValue} should start with a leading slash, automatically added.`),
          ))
          expect(call).not.toBe(-1)
        }

        await page.close()
        await server.close()
      })
    }
  }
})

describe('route with custom base', { sequential: true }, () => {
  it('serves spritemap at base + route URL', async () => {
    const port = 5190
    const page = await browser.newPage()
    const server = await createServer({
      configFile: false,
      root: getPath('./fixtures/basic'),
      optimizeDeps: { noDiscovery: true },
      server: { port },
      base: '/app/',
      plugins: [
        VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg')),
      ],
    })
    await server.listen()
    // `resolvedUrls` already carries the base; doubling it lands on the html
    // fallback, whose markup also holds an `<svg>`
    await page.goto(`${server.resolvedUrls!.local[0]}__spritemap`)

    const result = await page.content()
    expect(result).toContain('<symbol')

    await page.close()
    await server.close()
  })

  // Regression: the generated style file must embed the raw, base-agnostic
  // route in both dev and build. Previously the dev server baked `config.base`
  // into the route written to the style file, so the same source produced
  // `/app/__spritemap` in dev but `/__spritemap` in build.
  it('writes the same raw route to the generated style in dev and build', async () => {
    const base = '/build-website/'
    const filename = getPath('./fixtures/basic/styles/_base_consistency.scss')
    const readRoute = async () =>
      (await fs.readFile(filename, 'utf8')).match(/\$route: '([^']*)'/)?.[1]
    const stylesOption = { styles: { filename, lang: 'scss' as const, include: ['mixin' as const] } }

    await build({
      configFile: false,
      logLevel: 'silent',
      root: getPath('./fixtures/basic'),
      base,
      build: { outDir: getPath('./fixtures/basic/dist/_base_consistency') },
      plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), stylesOption)],
    })
    const buildRoute = await readRoute()

    const port = 5191
    const server = await createServer({
      configFile: false,
      logLevel: 'silent',
      root: getPath('./fixtures/basic'),
      base,
      optimizeDeps: { noDiscovery: true },
      server: { port },
      plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), stylesOption)],
    })
    await server.listen()
    const devRoute = await readRoute()
    // dev still serves the spritemap behind the base
    const served = await fetch(`${server.resolvedUrls!.local[0]}__spritemap`)
    const servedBody = await served.text()
    await server.close()
    await fs.rm(filename, { force: true })

    expect(buildRoute).toBe('/__spritemap')
    expect(devRoute).toBe('/__spritemap')
    expect(served.headers.get('content-type')).toBe('image/svg+xml')
    expect(servedBody).toContain('<symbol')
  })

  // Regression for #102 (Case 1): a raw absolute `/__spritemap` reference must
  // resolve through `config.base` in production too, so the emitted asset path
  // is prefixed with the base (and never doubled).
  it('rewrites the route to the base-prefixed emitted asset in build', async () => {
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      root: getPath('./fixtures/basic'),
      base: '/example/',
      build: { write: false, outDir: getPath('./fixtures/basic/dist/_base_build') },
      plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'))],
    })
    const outputs = (Array.isArray(result) ? result : [result]) as Array<{ output: any[] }>
    const html = outputs
      .flatMap(o => o.output)
      .find(file => file.fileName.endsWith('.html'))
    const source = String(html.source)

    expect(source).toMatch(/\/example\/assets\/spritemap\.[^"#]+\.svg#sprite-vite/)
    // base must not be doubled
    expect(source).not.toContain('/example/example/')
  })

  // Regression for #102 (Case 2): with an absolute base, a *relative*
  // `./__spritemap` reference must resolve to the base-prefixed asset without
  // doubling the base. Previously the route regex matched `/__spritemap`
  // inside `./__spritemap` and left the dot, producing `./example/assets/…`
  // which the browser resolves to `/example/example/…`.
  it('does not double the base for a relative route reference in build (absolute base)', async () => {
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      root: getPath('./fixtures/basic'),
      base: '/example/',
      build: {
        write: false,
        outDir: getPath('./fixtures/basic/dist/_relative_abs'),
        rollupOptions: { input: getPath('./fixtures/basic/relative.html') },
      },
      plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'))],
    })
    const outputs = (Array.isArray(result) ? result : [result]) as Array<{ output: any[] }>
    const html = outputs.flatMap(o => o.output).find(file => file.fileName.endsWith('.html'))
    const source = String(html.source)

    expect(source).toMatch(/"\/example\/assets\/spritemap\.[^"#]+\.svg#sprite-vite"/)
    expect(source).not.toContain('/example/example/')
    expect(source).not.toContain('"./example/')
  })

  // A *relative* base must keep emitting a relative asset path (the SvelteKit /
  // sub-path-deploy use case), so a relative `./__spritemap` reference must
  // stay relative — the dot is preserved, never turned into an absolute path.
  it('keeps the relative asset path for a relative route reference in build (relative base)', async () => {
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      root: getPath('./fixtures/basic'),
      base: './',
      build: {
        write: false,
        outDir: getPath('./fixtures/basic/dist/_relative_rel'),
        rollupOptions: { input: getPath('./fixtures/basic/relative.html') },
      },
      plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'))],
    })
    const outputs = (Array.isArray(result) ? result : [result]) as Array<{ output: any[] }>
    const html = outputs.flatMap(o => o.output).find(file => file.fileName.endsWith('.html'))
    const source = String(html.source)

    expect(source).toMatch(/"\.\/assets\/spritemap\.[^"#]+\.svg#sprite-vite"/)
  })

  // Counterpart to #40 (SvelteKit) and the answer to #134: a relative base
  // keeps an absolute `/__spritemap` reference absolute. A relative path would
  // resolve against the document for a JS chunk and against the stylesheet for
  // CSS, so it breaks on any deep route. Deploying under a sub-path is what an
  // absolute `base` is for, not a relative one.
  it('keeps an absolute route reference absolute in build (relative base)', async () => {
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      root: getPath('./fixtures/basic'),
      base: './',
      build: {
        write: false,
        outDir: getPath('./fixtures/basic/dist/_absolute_rel'),
        rollupOptions: { input: getPath('./fixtures/basic/index.html') },
      },
      plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'))],
    })
    const outputs = (Array.isArray(result) ? result : [result]) as Array<{ output: any[] }>
    const html = outputs.flatMap(o => o.output).find(file => file.fileName.endsWith('.html'))
    const source = String(html.source)

    expect(source).toMatch(/"\/assets\/spritemap\.[^"#]+\.svg#sprite-vite"/)
  })

  // Regression for #102 (Case 1): a raw absolute `/__spritemap` reference in a
  // JS/Vue module (not an `?use`/`?view` import) must be rewritten to the
  // base-aware URL in dev. Previously only CSS was rewritten, so the request
  // hit `/__spritemap` (no base) and never matched the serving middleware.
  it('rewrites raw route references in JS modules to the base-aware URL in dev', async () => {
    const base = '/build-website/'
    const port = 5193
    const server = await createServer({
      configFile: false,
      logLevel: 'silent',
      root: getPath('./fixtures/basic'),
      base,
      optimizeDeps: { noDiscovery: true },
      server: { port },
      plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'))],
    })
    await server.listen()
    const result = await server.transformRequest('/use-spritemap.js')
    await server.close()

    expect(result?.code).toMatch(/\/build-website\/__spritemap__[^#'"]+#sprite-vite/)
    expect(result?.code).not.toContain('\'/__spritemap#')
  })

  // Regression for #102 (Case 2): a relative `./__spritemap` reference in a JS
  // module must also resolve to the base-aware URL in dev, with the leading
  // dot swallowed so the base isn't doubled (`./build-website/…`).
  it('rewrites a relative route reference in JS modules to the base-aware URL in dev', async () => {
    const base = '/build-website/'
    const port = 5194
    const server = await createServer({
      configFile: false,
      logLevel: 'silent',
      root: getPath('./fixtures/basic'),
      base,
      optimizeDeps: { noDiscovery: true },
      server: { port },
      plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'))],
    })
    await server.listen()
    const result = await server.transformRequest('/use-spritemap-relative.js')
    await server.close()

    expect(result?.code).toMatch(/'\/build-website\/__spritemap__[^#'"]+#sprite-vite'/)
    expect(result?.code).not.toContain('./build-website/')
  })

  // The raw route written to source must still resolve to the base-aware URL in
  // the browser: the dev server rewrites raw `/__spritemap` references to
  // `<base>/__spritemap__<hash>` so the request matches the serving middleware.
  it('rewrites raw route references to the base-aware URL in dev', async () => {
    const base = '/build-website/'
    const port = 5192
    const page = await browser.newPage()
    const server = await createServer({
      configFile: false,
      logLevel: 'silent',
      root: getPath('./fixtures/basic'),
      base,
      optimizeDeps: { noDiscovery: true },
      server: { port },
      plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'))],
    })
    await server.listen()
    await page.goto(server.resolvedUrls!.local[0])

    const href = await page.getAttribute('svg use', 'xlink:href')
    expect(href).toMatch(/^\/build-website\/__spritemap__[^#]+#sprite-vite$/)

    await page.close()
    await server.close()
  })
})
