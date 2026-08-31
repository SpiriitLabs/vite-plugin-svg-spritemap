import type { RollupOutput } from 'rollup'
import type { ResolvedConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { build, createLogger, createServer } from 'vite'
import { describe, expect, it } from 'vitest'
import { createRouteModuleId } from '../src/helpers/routeModule'
import VitePluginSvgSpritemap from '../src/index'
import { getPath } from './helpers/path'

// Hooks are declared as plain methods, but the type allows the object form
function handlerOf(hook: unknown): (...args: never[]) => unknown {
  return (typeof hook === 'function' ? hook : (hook as { handler: never }).handler) as never
}

const ROUTE = '/__spritemap'
const MODULE_ID = createRouteModuleId(ROUTE)

// Vue's `transformAssetUrls` compiles `<use xlink:href="/__spritemap#icon">`
// into an import of the route. Nothing resolved it, so dev failed with "Failed
// to resolve import" and build with "Rollup failed to resolve import" (#54).
describe('route as an import specifier', () => {
  describe('dev', () => {
    async function devPlugins({ route, base = '/' }: { route?: string, base?: string } = {}) {
      const plugins = VitePluginSvgSpritemap(
        getPath('./fixtures/basic/svg/*.svg'),
        { svgo: false, oxvg: false, styles: false, types: false, ...(route && { route }) },
      )
      const common = plugins.find(item => item.name === 'vite-plugin-svg-spritemap:common')!
      const dev = plugins.find(item => item.name === 'vite-plugin-svg-spritemap:dev')!

      // Only `root`, `logger`, `command` and `base` are read on this path
      const config = {
        root: getPath('./fixtures/basic'),
        logger: createLogger('silent'),
        command: 'serve',
        base,
      } as unknown as ResolvedConfig

      await handlerOf(common.configResolved).call(undefined as never, config as never)
      await handlerOf(dev.buildStart).call({ addWatchFile: () => {} } as never)

      return dev
    }

    it('resolves the raw route to the url module', async () => {
      const dev = await devPlugins()
      expect(handlerOf(dev.resolveId).call(undefined as never, ROUTE as never)).toBe(MODULE_ID)
    })

    // What the resolver actually receives, `transform` having rewritten it
    it('resolves the hashed route to the url module', async () => {
      const dev = await devPlugins()
      expect(handlerOf(dev.resolveId).call(undefined as never, `${ROUTE}__a1b2c3` as never))
        .toBe(MODULE_ID)
    })

    it('leaves the virtual client module alone', async () => {
      const dev = await devPlugins()
      const clientId = '/@vite-plugin-svg-spritemap/client'
      expect(handlerOf(dev.resolveId).call(undefined as never, clientId as never)).toBe(clientId)
    })

    it('exports the base-aware, hashed url as a string', async () => {
      const dev = await devPlugins()
      const code = handlerOf(dev.load).call(undefined as never, MODULE_ID as never) as string
      expect(code).toMatch(/^export default "\/__spritemap__[a-f0-9]+"$/)
    })

    it('only claims its own route when several instances run', async () => {
      const dev = await devPlugins({ route: '/__flags' })
      const flagsId = createRouteModuleId('/__flags')
      expect(handlerOf(dev.resolveId).call(undefined as never, '/__flags' as never)).toBe(flagsId)
      // a sibling sharing the prefix is a different instance's route
      expect(handlerOf(dev.resolveId).call(undefined as never, '/__flags-docs' as never))
        .toBeUndefined()
    })

    it('serves the import through a real dev server', async () => {
      const server = await createServer({
        configFile: false,
        logLevel: 'silent',
        root: getPath('./fixtures/basic'),
        optimizeDeps: { noDiscovery: true },
        server: { port: 5302 },
        plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), {
          styles: false,
          types: false,
        })],
      })
      await server.listen()
      const importer = await server.transformRequest('/import-spritemap.js')
      const url = await server.transformRequest(MODULE_ID)
      await server.close()

      expect(importer?.code).toContain(MODULE_ID)
      expect(url?.code).toMatch(/export default "\/__spritemap__[a-f0-9]+"/)
    })

    // `transform` writes the base-prefixed url, which only Vite strips back off
    // before resolving: Nuxt answered a raw template reference with "Failed to
    // load url /_nuxt/__spritemap__<hash>" (#138)
    describe('under a non-root base', () => {
      const BASE = '/build-website/'
      const BASED_ROUTE = `${BASE.slice(0, -1)}${ROUTE}`

      // every spelling collapses onto one id, so the module graph keeps one entry
      it('resolves the base-prefixed specifier the ssr loader passes on', async () => {
        const dev = await devPlugins({ base: BASE })
        for (const id of [BASED_ROUTE, `${BASED_ROUTE}__a1b2c3`, ROUTE, `${ROUTE}__a1b2c3`])
          expect(handlerOf(dev.resolveId).call(undefined as never, id as never)).toBe(MODULE_ID)
        expect(MODULE_ID).not.toContain('build-website')
      })

      it('exports the base-aware, hashed url as a string', async () => {
        const dev = await devPlugins({ base: BASE })
        const code = handlerOf(dev.load).call(undefined as never, MODULE_ID as never) as string
        expect(code).toMatch(/^export default "\/build-website\/__spritemap__[a-f0-9]+"$/)
      })

      it('only claims its own base-prefixed route when several instances run', async () => {
        const dev = await devPlugins({ route: '/__flags', base: BASE })
        const flagsId = createRouteModuleId('/__flags')
        expect(handlerOf(dev.resolveId).call(undefined as never, `${BASE}__flags` as never))
          .toBe(flagsId)
        // a sibling sharing the prefix is a different instance's route
        expect(handlerOf(dev.resolveId).call(undefined as never, `${BASE}__flags-docs` as never))
          .toBeUndefined()
      })

      // the loose filter lets these reach the handler, the matcher declines them
      it('leaves an id that merely holds the route unresolved', async () => {
        const dev = await devPlugins({ base: BASE })
        const ids = [
          `${ROUTE}/nested.png`,
          `${BASED_ROUTE}/nested.png`,
          `${ROUTE}#sprite-vite`,
          `${BASED_ROUTE}?v=1`,
          `src${ROUTE}`,
          MODULE_ID, // holds the route, so the loose gate fires on it
        ]
        for (const id of ids)
          expect(handlerOf(dev.resolveId).call(undefined as never, id as never)).toBeUndefined()
      })

      it('treats regex metacharacters in the route literally under a base', async () => {
        const dev = await devPlugins({ route: '/icons.svg', base: BASE })
        expect(handlerOf(dev.resolveId).call(undefined as never, `${BASE}icons.svg` as never))
          .toBe(createRouteModuleId('/icons.svg'))
        expect(handlerOf(dev.resolveId).call(undefined as never, `${BASE}iconsXsvg` as never))
          .toBeUndefined()
      })

      // The reported failure without Nuxt: the ssr environment is reached the way
      // vite-node reaches it, base still on the specifier
      it('loads the base-prefixed specifier through the ssr environment', async () => {
        const server = await createServer({
          configFile: false,
          logLevel: 'silent',
          root: getPath('./fixtures/basic'),
          base: BASE,
          optimizeDeps: { noDiscovery: true },
          server: { port: 5304 },
          plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), {
            styles: false,
            types: false,
          })],
        })
        await server.listen()
        // a hash the server never wrote, what a stale importer holds
        const specifier = `${BASED_ROUTE}__a1b2c3`
        const resolved = await server.environments.ssr.pluginContainer.resolveId(specifier)
        const loaded = await server.ssrLoadModule(specifier)
        const client = await server.environments.client.pluginContainer.resolveId(specifier)
        // ssr code never carries a base-prefixed id, so `load` needs no tolerance
        const importer = await server.environments.ssr.transformRequest('/import-spritemap.js')
        // the middleware is installed ahead of Vite's transform one, so it wins
        const served = await fetch(`${server.resolvedUrls!.local[0]}__spritemap`)
        const servedBody = await served.text()
        await server.close()

        expect(resolved?.id).toBe(MODULE_ID)
        expect(client?.id).toBe(MODULE_ID)
        expect(loaded.default).toMatch(/^\/build-website\/__spritemap__[a-f0-9]+$/)
        expect(loaded.default).not.toContain('__a1b2c3')
        expect(importer?.code).toContain(MODULE_ID)
        expect(importer?.code).not.toContain(`${BASE}@vite-plugin-svg-spritemap`)
        expect(served.headers.get('content-type')).toBe('image/svg+xml')
        expect(servedBody).toContain('<symbol')
      })
    })
  })

  // The path #54 reports: a template with no `?use` import, compiled by Vue
  it('resolves the import Vue compiles out of a raw template reference', async () => {
    const server = await createServer({
      configFile: false,
      logLevel: 'silent',
      root: getPath('./fixtures/vue'),
      cacheDir: getPath('./fixtures/vue/node_modules/.vite-5303'),
      optimizeDeps: { noDiscovery: true },
      server: { port: 5303 },
      plugins: [
        vue(),
        VitePluginSvgSpritemap(getPath('./fixtures/vue/svg/*.svg'), {
          styles: false,
          types: false,
        }),
      ],
    })
    await server.listen()
    const sfc = await server.transformRequest('/RawRoute.vue')
    await server.close()

    expect(sfc?.code).toContain(MODULE_ID)
    expect(sfc?.code).toContain(`_imports_0 + '#sprite-vite'`)
  })

  describe('build', () => {
    it('resolves the import to the emitted asset path', async () => {
      const result = await build({
        configFile: false,
        logLevel: 'silent',
        root: getPath('./fixtures/basic'),
        build: {
          write: false,
          rollupOptions: {
            input: getPath('./fixtures/basic/import-spritemap.js'),
            // keep the export, so the url survives tree-shaking
            preserveEntrySignatures: 'strict',
          },
        },
        plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), {
          styles: false,
          types: false,
        })],
      }) as RollupOutput

      const chunk = result.output.find(file => file.type === 'chunk')!
      const asset = result.output.find(file => file.type === 'asset')!

      expect(chunk.type === 'chunk' && chunk.code).toContain(`/${asset.fileName}`)
      expect(asset.fileName).toMatch(/^assets\/spritemap\.[a-f0-9]+\.svg$/)
    })

    // A relative base keeps the reference's leading dot, so the exported url
    // has to stay relative too
    it.each([
      ['an absolute reference', './fixtures/basic/import-spritemap.js'],
      ['a relative reference', './fixtures/basic/import-spritemap-relative.js'],
    ])('resolves %s under a relative base', async (_name, input) => {
      const result = await build({
        configFile: false,
        logLevel: 'silent',
        root: getPath('./fixtures/basic'),
        base: './',
        build: {
          write: false,
          rollupOptions: { input: getPath(input), preserveEntrySignatures: 'strict' },
        },
        plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), {
          styles: false,
          types: false,
        })],
      }) as RollupOutput

      const chunk = result.output.find(file => file.type === 'chunk')!
      const asset = result.output.find(file => file.type === 'asset')!

      expect(chunk.type === 'chunk' && chunk.code).toContain(`./${asset.fileName}`)
    })

    it('leaves an unrelated unresolved import to Rollup', async () => {
      const build2 = build({
        configFile: false,
        logLevel: 'silent',
        root: getPath('./fixtures/basic'),
        build: {
          write: false,
          rollupOptions: { input: getPath('./fixtures/basic/import-missing.js') },
        },
        plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), {
          styles: false,
          types: false,
        })],
      })

      await expect(build2).rejects.toThrow(/does-not-exist/)
    })

    // With nothing emitted there is no url to compare an id against, so the
    // hook has to bow out rather than reach for the missing file name and bury
    // Rollup's own report of the unresolved import
    it('leaves an unrelated unresolved import to Rollup when nothing is emitted', async () => {
      const build2 = build({
        configFile: false,
        logLevel: 'silent',
        root: getPath('./fixtures/basic'),
        build: {
          write: false,
          rollupOptions: { input: getPath('./fixtures/basic/import-missing.js') },
        },
        plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), {
          styles: false,
          types: false,
          output: false,
        })],
      })

      await expect(build2).rejects.toThrow(/does-not-exist/)
    })

    // Nothing is emitted to point an import at, so the route stays external
    it('leaves the import external when no spritemap is emitted', async () => {
      const result = await build({
        configFile: false,
        logLevel: 'silent',
        root: getPath('./fixtures/basic'),
        build: {
          write: false,
          rollupOptions: {
            input: getPath('./fixtures/basic/import-spritemap.js'),
            preserveEntrySignatures: 'strict',
          },
        },
        plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), {
          styles: false,
          types: false,
          output: false,
        })],
      }) as RollupOutput

      const chunk = result.output.find(file => file.type === 'chunk')!
      expect(chunk.type === 'chunk' && chunk.code).toContain(ROUTE)
      expect(result.output.some(file => file.type === 'asset')).toBe(false)
    })
  })
})
