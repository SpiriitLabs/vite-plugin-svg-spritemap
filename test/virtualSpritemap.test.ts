import type { RollupOutput } from 'rollup'
import type { ResolvedConfig } from 'vite'
import type { UserOptions } from '../src/types'
import { promises as fsp } from 'node:fs'
import { build, createLogger, createServer } from 'vite'
import { afterAll, describe, expect, it } from 'vitest'
import { createRouteModuleId, parseVirtualSpritemapId } from '../src/helpers/routeModule'
import VitePluginSvgSpritemap from '../src/index'
import { getPath } from './helpers/path'

// Hooks are declared as plain methods, but the type allows the object form
function handlerOf(hook: unknown): (...args: never[]) => unknown {
  return (typeof hook === 'function' ? hook : (hook as { handler: never }).handler) as never
}

const ROUTE = '/__spritemap'
const MODULE_ID = createRouteModuleId(ROUTE)
const OBJECT_ID = createRouteModuleId(ROUTE, 'object')
const RAW_ID = createRouteModuleId(ROUTE, 'raw')
const VIRTUAL = 'virtual:spritemap'

// `this.error` throws, which is how a hook reports; stand in for Rollup's context
const errorContext = {
  error: (message: string) => {
    throw new Error(message)
  },
}

afterAll(async () => {
  await fsp.rm(getPath('./fixtures/virtual-idify'), { recursive: true, force: true })
})

describe('parseVirtualSpritemapId', () => {
  it.each([
    [VIRTUAL, { name: 'spritemap', kind: 'object' }],
    [`${VIRTUAL}/flags`, { name: 'flags', kind: 'object' }],
    [`${VIRTUAL}?url`, { name: 'spritemap', kind: 'url' }],
    [`${VIRTUAL}?raw`, { name: 'spritemap', kind: 'raw' }],
    [`${VIRTUAL}/flags?url`, { name: 'flags', kind: 'url' }],
    [`${VIRTUAL}/flags?raw`, { name: 'flags', kind: 'raw' }],
    [`${VIRTUAL}/flags?raw&t=1`, { name: 'flags', kind: 'raw' }],
    // params Vite appends, in either order, must not change the verdict
    [`${VIRTUAL}?url&t=123`, { name: 'spritemap', kind: 'url' }],
    [`${VIRTUAL}?import&raw`, { name: 'spritemap', kind: 'raw' }],
    [`${VIRTUAL}?t=123`, { name: 'spritemap', kind: 'object' }],
  ])('parses %s', (id, expected) => {
    expect(parseVirtualSpritemapId(id)).toEqual(expected)
  })

  it.each([
    `${VIRTUAL}-docs`,
    'virtual:something',
    'virtual:spritemapx',
    `${VIRTUAL}/`,
    `/build-website/${VIRTUAL}`,
  ])('declines %s', (id) => {
    expect(parseVirtualSpritemapId(id)).toBeNull()
  })
})

// `route.name` defaults to the url minus its slash, so `/spritemap` collides
// with the default instance's name without the two routes colliding
describe('duplicate route names', () => {
  it('warns, naming the option that separates them', () => {
    const warnings: string[] = []
    const logger = { ...createLogger('silent'), warn: (message: string) => warnings.push(message) }
    const plugins = VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), {
      route: '/spritemap',
      styles: false,
      types: false,
    })
    const common = plugins.find(item => item.name === 'vite-plugin-svg-spritemap:common')!

    handlerOf(common.configResolved).call(undefined as never, {
      root: getPath('./fixtures/basic'),
      logger,
      command: 'serve',
      base: '/',
      plugins: [{ api: { routeName: 'spritemap' } }, { api: { routeName: 'spritemap' } }],
    } as unknown as ResolvedConfig as never)

    expect(warnings.join('\n')).toMatch(/share the route name "spritemap".*route\.name/s)
  })

  it('stays quiet when every instance has its own name', () => {
    const warnings: string[] = []
    const logger = { ...createLogger('silent'), warn: (message: string) => warnings.push(message) }
    const plugins = VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), {
      styles: false,
      types: false,
    })
    const common = plugins.find(item => item.name === 'vite-plugin-svg-spritemap:common')!

    handlerOf(common.configResolved).call(undefined as never, {
      root: getPath('./fixtures/basic'),
      logger,
      command: 'serve',
      base: '/',
      plugins: [{ api: { routeName: 'spritemap' } }, { api: { routeName: '__flags' } }],
    } as unknown as ResolvedConfig as never)

    expect(warnings.join('\n')).not.toMatch(/share the route name/)
  })
})

// The framework-agnostic way to reach the sprite: no route url written by hand,
// so a dependency or a monorepo sibling can reference it too (#135, #49, #52, #59)
describe('virtual:spritemap', () => {
  describe('dev', () => {
    async function devPlugins({ route, base = '/', siblings, pattern, idify }: { route?: string, base?: string, siblings?: string[], pattern?: string, idify?: UserOptions['idify'] } = {}) {
      const plugins = VitePluginSvgSpritemap(
        pattern ?? getPath('./fixtures/basic/svg/*.svg'),
        { svgo: false, oxvg: false, styles: false, types: false, ...(route && { route }), ...(idify && { idify }) },
      )
      const common = plugins.find(item => item.name === 'vite-plugin-svg-spritemap:common')!
      const dev = plugins.find(item => item.name === 'vite-plugin-svg-spritemap:dev')!

      // Only `root`, `logger`, `command` and `base` are read on this path
      const config = {
        root: getPath('./fixtures/basic'),
        logger: createLogger('silent'),
        command: 'serve',
        base,
        // What `collectRouteNames` reads: each instance publishes its route name
        ...(siblings && { plugins: siblings.map(routeName => ({ api: { routeName } })) }),
      } as unknown as ResolvedConfig

      await handlerOf(common.configResolved).call(undefined as never, config as never)
      handlerOf(dev.configResolved).call(undefined as never, config as never)
      await handlerOf(dev.buildStart).call({ addWatchFile: () => {} } as never)

      return dev
    }

    // Both spellings name the same instance, so they land on the same module
    it('resolves the bare and the suffixed id to the object module', async () => {
      const dev = await devPlugins()
      for (const id of [VIRTUAL, `${VIRTUAL}/spritemap`])
        expect(handlerOf(dev.resolveId).call(undefined as never, id as never)).toBe(OBJECT_ID)
    })

    // `?url` shares the url module with a raw route reference, so that spelling
    // still collapses onto one entry in the graph
    it('sends ?url to the same module a route reference resolves to', async () => {
      const dev = await devPlugins()
      expect(handlerOf(dev.resolveId).call(undefined as never, `${VIRTUAL}?url` as never))
        .toBe(MODULE_ID)
      expect(handlerOf(dev.resolveId).call(undefined as never, ROUTE as never)).toBe(MODULE_ID)
      expect(handlerOf(dev.resolveId).call(undefined as never, `${VIRTUAL}?raw` as never))
        .toBe(RAW_ID)
    })

    it('exports the object with a prefix-applying href', async () => {
      const dev = await devPlugins()
      const code = handlerOf(dev.load).call(undefined as never, OBJECT_ID as never) as string
      const sprite = (await import(`data:text/javascript,${encodeURIComponent(code)}`)).default

      expect(sprite.name).toBe('spritemap')
      expect(sprite.prefix).toBe('sprite-')
      expect(sprite.url).toMatch(/^\/__spritemap__[a-f0-9]+$/)
      // unprefixed and sorted, as the generated `Icons` union is
      expect(sprite.icons).toEqual([...sprite.icons].sort())
      expect(sprite.icons).toContain('vite')
      expect(sprite.icons).not.toContain('sprite-vite')
      expect(sprite.href('vite')).toBe(`${sprite.url}#sprite-vite`)
    })

    it('exports the spritemap source for ?raw', async () => {
      const dev = await devPlugins()
      const code = handlerOf(dev.load).call(undefined as never, RAW_ID as never) as string
      const source = (await import(`data:text/javascript,${encodeURIComponent(code)}`)).default

      expect(source).toContain('<symbol')
      expect(source).toContain('id="sprite-vite"')
    })

    // The bare id is `.../spritemap`, not "whichever instance": a custom route
    // has a different name, so it is named rather than silently answered
    it('refuses the bare id on a custom route, naming the instance', async () => {
      const dev = await devPlugins({ route: '/icons' })
      expect(() => handlerOf(dev.resolveId).call(errorContext as never, VIRTUAL as never))
        .toThrow(/names no configured spritemap.*"virtual:spritemap\/icons"/)
      expect(handlerOf(dev.resolveId).call(errorContext as never, `${VIRTUAL}/icons` as never))
        .toBe(createRouteModuleId('/icons', 'object'))
    })

    it('exports the base-aware, hashed url as a string', async () => {
      const dev = await devPlugins({ base: '/build-website/' })
      const id = handlerOf(dev.resolveId).call(undefined as never, `${VIRTUAL}?url` as never)
      const code = handlerOf(dev.load).call(undefined as never, id as never) as string
      expect(code).toMatch(/^export default "\/build-website\/__spritemap__[a-f0-9]+"$/)
    })

    // The id a user writes carries no base, so `withoutBase` never applies to it
    it('resolves the same id under a non-root base', async () => {
      const dev = await devPlugins({ base: '/build-website/' })
      expect(handlerOf(dev.resolveId).call(undefined as never, VIRTUAL as never)).toBe(OBJECT_ID)
      expect(handlerOf(dev.resolveId).call(undefined as never, `/build-website/${VIRTUAL}` as never))
        .toBeUndefined()
    })

    // The suffix is `route.name`, which defaults to the url minus its leading
    // slash: `/__flags` gives `virtual:spritemap/__flags`
    it('claims only its own suffix, leaving a sibling\'s to that sibling', async () => {
      const dev = await devPlugins({ route: '/__flags', siblings: ['__flags', 'spritemap'] })
      expect(handlerOf(dev.resolveId).call(errorContext as never, `${VIRTUAL}/__flags` as never))
        .toBe(createRouteModuleId('/__flags', 'object'))
      // both queries ride along with the named form
      expect(handlerOf(dev.resolveId).call(errorContext as never, `${VIRTUAL}/__flags?url` as never))
        .toBe(createRouteModuleId('/__flags'))
      expect(handlerOf(dev.resolveId).call(errorContext as never, `${VIRTUAL}/__flags?raw` as never))
        .toBe(createRouteModuleId('/__flags', 'raw'))
      // the other instance owns it, so this one declines rather than erroring
      expect(handlerOf(dev.resolveId).call(errorContext as never, VIRTUAL as never))
        .toBeUndefined()
    })

    // Adding an instance must not change what an existing import means, so the
    // verdict comes from the names alone, never from how many there are
    it('lists every configured instance when an id names none', async () => {
      const dev = await devPlugins({ route: '/__flags', siblings: ['__flags', 'spritemap'] })
      expect(() => handlerOf(dev.resolveId).call(errorContext as never, `${VIRTUAL}/typo` as never))
        .toThrow(/"virtual:spritemap\/__flags", "virtual:spritemap\/spritemap"/)
    })

    // The dep scanner resolves through esbuild, not the plugin container, so a
    // dependency importing the id would be reported missing without this
    it('excludes the ids from dependency pre-bundling', async () => {
      const plugins = VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), { route: '/icons' })
      const dev = plugins.find(item => item.name === 'vite-plugin-svg-spritemap:dev')!
      const config = handlerOf(dev.config).call(undefined as never) as {
        optimizeDeps: { exclude: string[] }
      }

      expect(config.optimizeDeps.exclude).toEqual([`${VIRTUAL}/icons`])
    })

    // Guard: the prefix is not a namespace this plugin owns wholesale, so an id
    // that merely starts like one is left to whoever does own it
    it('leaves an unrelated virtual id unresolved', async () => {
      const dev = await devPlugins()
      for (const id of [`${VIRTUAL}-docs`, 'virtual:something', 'virtual:spritemapx'])
        expect(handlerOf(dev.resolveId).call(errorContext as never, id as never)).toBeUndefined()
    })

    // The client only rewrites urls already in the DOM, which cannot fix a
    // stale `icons` list or stale markup
    /**
     * Every module the graph holds, and what the handler did to them. Returning a
     * module full-reloads the page, since nothing accepts these
     */
    function hotUpdateContext(root: string) {
      const invalidated: string[] = []
      const modules = new Map([
        [OBJECT_ID, { id: OBJECT_ID }],
        [RAW_ID, { id: RAW_ID }],
        [MODULE_ID, { id: MODULE_ID }],
      ])

      return {
        invalidated,
        context: {
          environment: {
            config: { root },
            hot: { send: () => {} },
            moduleGraph: {
              getModuleById: (id: string) => modules.get(id) ?? null,
              invalidateModule: (module: { id: string }) => invalidated.push(module.id),
            },
          },
        },
      }
    }

    // A content edit leaves `icons` alone, and the url the object carries is
    // answered by the middleware whatever hash it holds, so reloading the page
    // over it would throw away the in-place patch the client just made
    it('leaves the object module alone on a content edit', async () => {
      const dev = await devPlugins()
      const { context, invalidated } = hotUpdateContext(getPath('./fixtures/basic'))

      const updated = await handlerOf(dev.hotUpdate).call(context as never, {
        file: getPath('./fixtures/basic/svg/vite.svg'),
        type: 'update',
      } as never) as { id: string }[]

      expect(updated.map(module => module.id)).toEqual([RAW_ID])
      expect(invalidated).toEqual([RAW_ID])
    })

    // The raw module always goes: nothing patches markup already inlined
    it('regenerates both when the icon set changes', async () => {
      const dev = await devPlugins()
      const { context, invalidated } = hotUpdateContext(getPath('./fixtures/basic'))

      const updated = await handlerOf(dev.hotUpdate).call(context as never, {
        file: getPath('./fixtures/basic/svg/vite.svg'),
        type: 'delete',
      } as never) as { id: string }[]

      expect(updated.map(module => module.id)).toEqual([OBJECT_ID, RAW_ID])
      expect(invalidated).toEqual([OBJECT_ID, RAW_ID])
      // the url module stays: the middleware answers any `__<hash>`, so an old
      // url still serves and its importers need no reload
      expect(updated.map(module => module.id)).not.toContain(MODULE_ID)
    })

    // `idify` is handed the icon's content, so an edit can rename an id without
    // any file being added or removed: the event type is not enough to tell
    it('regenerates the object module when an edit renames an id', async () => {
      const dir = `${getPath('./fixtures/virtual-idify')}/svg`
      const file = `${dir}/icon.svg`
      const icon = (size: number): string =>
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><path d="M0 0h1v1H0z"/></svg>`

      await fsp.mkdir(dir, { recursive: true })
      await fsp.writeFile(file, icon(10), 'utf8')

      const dev = await devPlugins({
        pattern: `${dir}/*.svg`,
        idify: (name, svg) => `${name}-${svg.width}`,
      })
      const { context, invalidated } = hotUpdateContext(getPath('./fixtures/virtual-idify'))

      await fsp.writeFile(file, icon(20), 'utf8')
      const updated = await handlerOf(dev.hotUpdate).call(context as never, {
        file,
        type: 'update',
      } as never) as { id: string }[]

      // icon-10 became icon-20, so a stale `icons` list is now wrong
      expect(updated.map(module => module.id)).toEqual([OBJECT_ID, RAW_ID])
      expect(invalidated).toEqual([OBJECT_ID, RAW_ID])
    })

    it('serves the import through a real dev server', async () => {
      const server = await createServer({
        configFile: false,
        logLevel: 'silent',
        root: getPath('./fixtures/basic'),
        optimizeDeps: { noDiscovery: true },
        server: { port: 5305 },
        plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), {
          styles: false,
          types: false,
        })],
      })
      await server.listen()
      const resolved = await server.environments.client.pluginContainer.resolveId(VIRTUAL)
      const loaded = await server.ssrLoadModule(VIRTUAL)
      const importer = await server.environments.ssr.transformRequest('/import-virtual.js')
      const served = await fetch(`${server.resolvedUrls!.local[0]}__spritemap`)
      const servedBody = await served.text()
      await server.close()

      expect(resolved?.id).toBe(OBJECT_ID)
      expect(loaded.default.url).toMatch(/^\/__spritemap__[a-f0-9]+$/)
      expect(loaded.default.href('vite')).toBe(`${loaded.default.url}#sprite-vite`)
      expect(importer?.code).toContain(OBJECT_ID)
      expect(served.headers.get('content-type')).toBe('image/svg+xml')
      expect(servedBody).toContain('<symbol')
    })
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
            input: getPath('./fixtures/basic/import-virtual.js'),
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

    // A relative base keeps the leading dot, as it does for a route reference
    it('exports a relative url under a relative base', async () => {
      const result = await build({
        configFile: false,
        logLevel: 'silent',
        root: getPath('./fixtures/basic'),
        base: './',
        build: {
          write: false,
          rollupOptions: {
            input: getPath('./fixtures/basic/import-virtual.js'),
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

      expect(chunk.type === 'chunk' && chunk.code).toContain(`./${asset.fileName}`)
    })

    it('resolves ?url to the emitted asset path', async () => {
      const result = await build({
        configFile: false,
        logLevel: 'silent',
        root: getPath('./fixtures/basic'),
        build: {
          write: false,
          rollupOptions: {
            input: getPath('./fixtures/basic/import-virtual-url.js'),
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
    })

    // `?raw` inlines the markup into the chunk; the asset is still emitted, so
    // it ships twice unless `output` is false
    it('inlines the spritemap source for ?raw', async () => {
      const result = await build({
        configFile: false,
        logLevel: 'silent',
        root: getPath('./fixtures/basic'),
        build: {
          write: false,
          rollupOptions: {
            input: getPath('./fixtures/basic/import-virtual-raw.js'),
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

      expect(chunk.type === 'chunk' && chunk.code).toContain('<symbol')
      expect(chunk.type === 'chunk' && chunk.code).toContain('sprite-vite')
      expect(String(asset.source)).toContain('<symbol')
    })

    // A named instance takes the queries too, and gets its own sprite for each
    it('carries ?url and ?raw on a named instance', async () => {
      const result = await build({
        configFile: false,
        logLevel: 'silent',
        root: getPath('./fixtures/basic'),
        build: {
          write: false,
          rollupOptions: {
            input: getPath('./fixtures/basic/import-virtual-flags-queries.js'),
            preserveEntrySignatures: 'strict',
          },
        },
        plugins: [
          VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), { styles: false, types: false }),
          VitePluginSvgSpritemap(getPath('./fixtures/basic/flags/*.svg'), {
            route: '/__flags',
            styles: false,
            types: false,
          }),
        ],
      }) as RollupOutput

      const chunk = result.output.find(file => file.type === 'chunk')!
      const code = chunk.type === 'chunk' ? chunk.code : ''
      const assets = result.output.filter(file => file.type === 'asset')
      const flags = assets.find(asset => String(asset.source).includes('sprite-CH'))!
      const icons = assets.find(asset => String(asset.source).includes('sprite-vite'))!

      // ?url gave the flags sprite, not the default instance's
      expect(code).toContain(`/${flags.fileName}`)
      expect(code).not.toContain(`/${icons.fileName}`)
      // ?raw inlined the flags markup, not the icons one
      expect(code).toContain('sprite-CH')
      expect(code).not.toContain('sprite-vite')
    })

    // The guarantee the whole rule exists for: adding an instance must not
    // change what an already-written import resolves to. The flags instance is
    // listed first, so it is asked before the owner and has to decline
    it('keeps the bare id on the default instance whatever the plugin order', async () => {
      const result = await build({
        configFile: false,
        logLevel: 'silent',
        root: getPath('./fixtures/basic'),
        build: {
          write: false,
          rollupOptions: {
            input: getPath('./fixtures/basic/import-virtual.js'),
            preserveEntrySignatures: 'strict',
          },
        },
        plugins: [
          VitePluginSvgSpritemap(getPath('./fixtures/basic/flags/*.svg'), {
            route: '/__flags',
            styles: false,
            types: false,
          }),
          VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), { styles: false, types: false }),
        ],
      }) as RollupOutput

      const chunk = result.output.find(file => file.type === 'chunk')!
      const assets = result.output.filter(file => file.type === 'asset')
      // the default instance's sprite, the one holding the icons
      const icons = assets.find(asset => String(asset.source).includes('sprite-vite'))!

      expect(assets).toHaveLength(2)
      expect(chunk.type === 'chunk' && chunk.code).toContain(`/${icons.fileName}`)
    })

    it('lists every configured instance when an id names none', async () => {
      const build2 = build({
        configFile: false,
        logLevel: 'silent',
        root: getPath('./fixtures/basic'),
        build: {
          write: false,
          rollupOptions: { input: getPath('./fixtures/basic/import-virtual-unknown.js') },
        },
        plugins: [
          VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), { styles: false, types: false }),
          VitePluginSvgSpritemap(getPath('./fixtures/basic/flags/*.svg'), {
            route: '/__flags',
            styles: false,
            types: false,
          }),
        ],
      })

      await expect(build2).rejects.toThrow(/"virtual:spritemap\/spritemap", "virtual:spritemap\/__flags"/)
    })

    // `?raw` inlines the markup, so it needs no emitted file — and `output:
    // false` is exactly how the docs say to avoid shipping the sprite twice
    it('still resolves ?raw when no spritemap is emitted', async () => {
      const result = await build({
        configFile: false,
        logLevel: 'silent',
        root: getPath('./fixtures/basic'),
        build: {
          write: false,
          rollupOptions: {
            input: getPath('./fixtures/basic/import-virtual-raw.js'),
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

      expect(chunk.type === 'chunk' && chunk.code).toContain('<symbol')
      // the point of `output: false` here: the sprite ships once, not twice
      expect(result.output.some(file => file.type === 'asset')).toBe(false)
    })

    // Nothing is emitted to point the import at, and unlike a route reference
    // there is no url for it to stay external as, so the error has to name the
    // option rather than read as a missing module
    it('names `output: false` when no spritemap is emitted', async () => {
      const build2 = build({
        configFile: false,
        logLevel: 'silent',
        root: getPath('./fixtures/basic'),
        build: {
          write: false,
          rollupOptions: { input: getPath('./fixtures/basic/import-virtual.js') },
        },
        plugins: [VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'), {
          styles: false,
          types: false,
          output: false,
        })],
      })

      await expect(build2).rejects.toThrow(/`output` option is false/)
    })
  })
})
