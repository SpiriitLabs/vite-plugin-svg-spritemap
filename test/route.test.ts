import type { Browser } from 'playwright'
import type { UserOptions } from '../src/types'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import VitePluginSvgSpritemap from '../src'
import { getPath } from './helper/path'

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

describe('route options', () => {
  const entries = Object.entries(routeConfigs)
  for (let index = 0; index < entries.length; index++) {
    const [key, route] = entries[index]
    if (Object.prototype.hasOwnProperty.call(routeConfigs, key)) {
      it.concurrent(key, async () => {
        const page = await browser.newPage()
        const port = 5175 + index
        const spy = vi.spyOn(console, 'warn')
        const server = await createServer({
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
        await page.goto(`http://localhost:${port}${route.expected}`)

        const result = await page.content()
        expect(result).toContain('<svg')

        const routeValue = typeof route.value === 'string' ? route.value : route.value?.url
        if (
          routeValue
          && !routeValue.startsWith('/')
        ) {
          for (const call of spy.mock.calls) {
            expect(call).toStrictEqual([
              `[vite-plugin-svg-spritemap] Route option ${routeValue} should start with a leading slash, automatically added.`,
            ])
          }
        }
        spy.mockClear()

        await page.close()
        await server.close()
      })
    }
  }
})
