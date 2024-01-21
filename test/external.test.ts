import { describe, expect, it } from 'vitest'
import type { ExternalOption } from 'rollup'
import { buildVite } from './helper/build'

const configs: Record<string, ExternalOption | undefined> = {
  no_external: undefined,
  external_string: 'jquery',
  external_array: ['jquery'],
  external_function: (source) => {
    if (source.includes('jquery'))
      return true
  },
}

describe('external', () => {
  for (const key in configs) {
    if (Object.prototype.hasOwnProperty.call(configs, key)) {
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
