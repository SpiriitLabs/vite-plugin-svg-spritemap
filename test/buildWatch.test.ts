import type { ResolvedConfig } from 'vite'
import { createLogger } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import VitePluginSvgSpritemap from '../src/index'
import { getPath } from './helpers/path'

// Hooks are declared as plain methods, but the type allows the object form
function handlerOf(hook: unknown): (...args: never[]) => unknown {
  return (typeof hook === 'function' ? hook : (hook as { handler: never }).handler) as never
}

describe('build watch files', () => {
  it('registers the icon directories with the watcher', async () => {
    const plugins = VitePluginSvgSpritemap(
      getPath('./fixtures/basic/flags/*.svg'),
      // `output: false` so `buildStart` skips the asset emit
      { svgo: false, oxvg: false, output: false },
    )
    const common = plugins.find(item => item.name === 'vite-plugin-svg-spritemap:common')!
    const build = plugins.find(item => item.name === 'vite-plugin-svg-spritemap:build')!

    // Only `root`, `logger` and `command` are read on this path
    const config = {
      root: getPath('./fixtures/basic'),
      logger: createLogger('silent'),
      command: 'build',
    } as unknown as ResolvedConfig

    // builds the SVGManager the build plugin reads from
    await handlerOf(common.configResolved).call(undefined as never, config as never)

    const addWatchFile = vi.fn()
    await handlerOf(build.buildStart).call({ addWatchFile } as never)

    expect(addWatchFile).toHaveBeenCalledWith(getPath('./fixtures/basic/flags'))
  })
})
