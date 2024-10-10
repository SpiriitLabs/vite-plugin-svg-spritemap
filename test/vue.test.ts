import type { UserOptions } from '../src/types'
import vue from '@vitejs/plugin-vue'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import VitePluginSvgSpritemap from '../src/index'
import { getPath } from './helper/path'

async function createVueServer(port: number, options: UserOptions | undefined = undefined) {
  const browser = await chromium.launch()
  const server = await createServer({
    // any valid user config options, plus `mode` and `configFile`
    configFile: false,
    root: getPath('./fixtures/vue'),
    server: {
      port,
      watch: {
        ignored: [getPath('./fixtures/vue/dist')], // ignore dist change because of parallized test
      },
    },
    plugins: [
      vue(),
      VitePluginSvgSpritemap(getPath('./fixtures/vue/svg/*.svg'), options),
    ],
  })
  await server.listen()
  const page = await browser.newPage()

  return { server, page, browser }
}

describe('vue components', () => {
  it('has components', async () => {
    const { page, server, browser } = await createVueServer(3001)

    await page.goto('http://localhost:3001')
    const result = await page.content()
    expect(result).toMatchSnapshot()

    await server.close()
    await browser.close()
  })

  it('test with warn', async () => {
    const spy = vi.spyOn(console, 'warn')

    const { page, server, browser } = await createVueServer(3002, {
      output: {
        view: false,
      },
    })

    await page.goto('http://localhost:3002')
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
        `[vite-plugin-svg-spritemap] You need to enable the output.view and the output.use option to load ${getPath('./fixtures/vue/svg/')}/${id}.svg?view as component with the ?view query.`,
      ])
    }
  })
})
