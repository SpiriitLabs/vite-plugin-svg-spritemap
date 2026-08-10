import type { ExternalOption } from 'rollup'
import type { ConfigEnv, UserConfig } from 'vite'
import { describe, expect, it } from 'vitest'
import VitePluginSvgSpritemap from '../src/index'
import { buildVite } from './helpers/build'
import { getPath } from './helpers/path'

const configs: Record<string, ExternalOption | undefined> = {
  no_external: undefined,
  external_string: 'jquery',
  external_array: ['jquery'],
  external_function: (source) => {
    if (source.includes('jquery'))
      return true
  },
}

// `buildVite` merges its config, and `mergeConfig` copies arrays, so the hook
// is called directly here to keep the user's own array identity
function callConfigHook(userConfig: UserConfig): UserConfig | null | void {
  const plugin = VitePluginSvgSpritemap(getPath('./fixtures/basic/svg/*.svg'))
    .find(item => item.name === 'vite-plugin-svg-spritemap:build')!
  const hook = plugin.config!
  const handler = typeof hook === 'function' ? hook : hook.handler

  return handler.call(
    undefined as never,
    userConfig,
    { command: 'build', mode: 'production' } satisfies ConfigEnv,
  ) as UserConfig | null | void
}

describe('external', () => {
  it('leaves the user external array untouched', () => {
    const userExternal: ExternalOption = ['jquery']
    const userConfig: UserConfig = {
      build: { rollupOptions: { external: userExternal } },
    }

    const first = callConfigHook(userConfig)
    const second = callConfigHook(userConfig)

    expect(userExternal).toEqual(['jquery'])
    expect(userConfig.build!.rollupOptions!.external).toBe(userExternal)
    // the route matcher is contributed through the returned config instead
    for (const result of [first, second])
      expect(result!.build!.rollupOptions!.external).toHaveLength(2)
  })

  for (const key in configs) {
    if (Object.hasOwn(configs, key)) {
      it.concurrent(key, async () => {
        const config = configs[key]
        await buildVite({
          name: `external_${key}`,
          options:
          {
            output: true,
          },
          viteConfig: {
            build: {
              rollupOptions: {
                external: config,
              },
            },
            plugins: [
              {
                name: 'read-config',
                configResolved(config) {
                  const external = config.build.rollupOptions.external
                  expect(external).toBeDefined()

                  if (external instanceof RegExp) {
                    expect(external.test('/__spritemap')).toBe(true)
                  }
                  else if (Array.isArray(external)) {
                    const callback = (item: string | RegExp) => {
                      if (typeof item === 'string')
                        return item === 'jquery'
                      else
                        return item.test('/__spritemap')
                    }
                    expect(external.some(callback)).toBe(true)
                    expect(external.some(callback)).toBe(true)
                  }
                  else if (typeof external === 'function') {
                    const spritemapExternal = external('/__spritemap', undefined, true)
                    expect(spritemapExternal).toBe(true)
                    const jqueryExternal = external('jquery', undefined, true)
                    expect(jqueryExternal).toBe(true)
                  }
                },
              },
            ],
          },
        })
      })
    }
  }
})
