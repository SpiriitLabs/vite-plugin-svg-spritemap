import { resolve } from 'path'
import fetch from 'node-fetch'
import { beforeAll, describe, expect, it } from 'vitest'
import { createServer, ViteDevServer } from 'vite'
import VitePluginSvgSpritemap from '../src/index'

let server: ViteDevServer

beforeAll(async () => {
  server = await createServer({
    // any valid user config options, plus `mode` and `configFile`
    configFile: false,
    root: resolve(__dirname, './project'),
    plugins: [
      VitePluginSvgSpritemap(resolve(__dirname, './project/svg/*.svg'), {})
    ]
  })
  await server.listen()

  return async () => {
    await server.close()
  }
})

describe('dev server', () => {
  it('HMR script is present', async () => {
    const result = await fetch('http://localhost:5173').then(res => res.text())
    const test =
      '<script type="module" src="/@vite-plugin-svg-spritemap/client"></script>'
    expect(result.includes(test)).toBeTruthy()
  })

  it('Get SVG spritemap', async () => {
    const result = await fetch('http://localhost:5173/__spritemap').then(res =>
      res.text()
    )
    expect(result).toMatchSnapshot()
  })
})
