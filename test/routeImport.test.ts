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
    async function devPlugins(route?: string) {
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
        base: '/',
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
      const dev = await devPlugins('/__flags')
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
