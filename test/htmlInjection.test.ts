import type { ResolvedConfig } from 'vite'
import { createLogger } from 'vite'
import { describe, expect, it } from 'vitest'
import VitePluginSvgSpritemap from '../src/index'
import { getPath } from './helpers/path'

const CLIENT = 'vite-plugin-svg-spritemap/client'

// Hooks are declared as plain methods, but the type allows the object form
function handlerOf(hook: unknown): (...args: never[]) => never {
  return (typeof hook === 'function' ? hook : (hook as { handler: never }).handler) as never
}

async function transformIndexHtml(html: string): Promise<string> {
  const plugins = VitePluginSvgSpritemap(
    getPath('./fixtures/basic/flags/*.svg'),
    { svgo: false, oxvg: false },
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

  handlerOf(common.configResolved).call(undefined as never, config as never)
  await handlerOf(dev.buildStart).call({ addWatchFile: () => {} } as never)

  return handlerOf(dev.transformIndexHtml).call({} as never, html as never)
}

describe('dev client injection', () => {
  it.each([
    ['a plain document', '<html><body><p>hi</p></body></html>'],
    // end tags are case-insensitive and may hold whitespace before `>`
    ['an uppercase end tag', '<html><BODY><p>hi</p></BODY></html>'],
    ['whitespace before the >', '<html><body><p>hi</p></body ></html>'],
    // an entry that is a fragment has no body tag at all
    ['a fragment', '<div><p>hi</p></div>'],
  ])('injects the client into %s', async (_label, html) => {
    const out = await transformIndexHtml(html)

    expect(out).toContain(CLIENT)
    expect(out.match(new RegExp(CLIENT, 'g'))).toHaveLength(1)
  })

  it('keeps the client inside the body when there is one', async () => {
    const out = await transformIndexHtml('<html><body><p>hi</p></body></html>')

    expect(out.indexOf(CLIENT)).toBeLessThan(out.indexOf('</body>'))
  })

  it('does not inject twice when the script is already present', async () => {
    const html = `<html><body><script type="module" src="/@${CLIENT}"></script></body></html>`
    const out = await transformIndexHtml(html)

    expect(out.match(new RegExp(CLIENT, 'g'))).toHaveLength(1)
  })

  it('still rewrites route references to the hashed url', async () => {
    const out = await transformIndexHtml('<div><svg><use href="/__spritemap#a"/></svg></div>')

    expect(out).toMatch(/\/__spritemap__[a-f0-9]+#a/)
  })
})
