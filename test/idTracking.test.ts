import type { ResolvedConfig } from 'vite'
import type { UserOptions } from '../src/types'
import { promises as fsp } from 'node:fs'
import { createLogger } from 'vite'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { SVGManager } from '../src/core/svgManager'
import { createOptions } from '../src/helpers/options'
import { getPath } from './helpers/path'

const root = getPath('./fixtures/id-tracking')

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h1v1H0z"/></svg>'

// One directory per test, so a manager never sees another test's files
let seeded = 0
async function seed(names: string[]): Promise<string> {
  const dir = `${root}/svg-${seeded++}`
  for (const name of names) {
    await fsp.mkdir(`${dir}/${name}`.replace(/\/[^/]+$/, ''), { recursive: true })
    await fsp.writeFile(`${dir}/${name}.svg`, svg, 'utf8')
  }
  return dir
}

function createManager(dir: string, overrides: UserOptions = {}) {
  // Only `root` and `logger` are ever read
  const config = {
    root,
    logger: createLogger('silent'),
  } as unknown as ResolvedConfig

  const { options } = createOptions({ svgo: false, oxvg: false, ...overrides })

  return {
    manager: new SVGManager(`${dir}/**/*.svg`, options, config, '/__spritemap'),
    logger: config.logger,
  }
}

afterAll(async () => {
  await fsp.rm(root, { recursive: true, force: true })
})

describe('duplicate id tracking', () => {
  it('keeps an id claimed while another file still uses it', async () => {
    // both resolve to the id `a`
    const dir = await seed(['a', 'nested/a'])
    const { manager, logger } = createManager(dir)
    await manager.updateAll()

    await manager.delete(`${dir}/nested/a.svg`)

    const spy = vi.spyOn(logger, 'warn')
    await manager.update(`${dir}/nested/a.svg`, 'create')

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('has the same id (a)'))
  })

  it('frees an id once no file uses it', async () => {
    const dir = await seed(['a', 'nested/a'])
    const { manager, logger } = createManager(dir)
    await manager.updateAll()

    await manager.delete(`${dir}/a.svg`)
    await manager.delete(`${dir}/nested/a.svg`)

    const spy = vi.spyOn(logger, 'warn')
    await manager.update(`${dir}/a.svg`, 'create')

    expect(spy).not.toHaveBeenCalled()
  })

  it('releases the previous id when a file resolves to a new one', async () => {
    const dir = await seed(['a', 'b'])
    let renamed = false
    // `a` starts as `one` then becomes `two`; `b` always wants `one`
    const { manager, logger } = createManager(dir, {
      idify: name => (name === 'a' && renamed ? 'two' : 'one'),
    })

    await manager.update(`${dir}/a.svg`, 'create')
    renamed = true
    await manager.update(`${dir}/a.svg`, 'update')

    const spy = vi.spyOn(logger, 'warn')
    await manager.update(`${dir}/b.svg`, 'create')

    // `one` was given up by `a`, so `b` may take it
    expect(spy).not.toHaveBeenCalled()
    expect([...manager.svgs.values()].map(item => item.id).sort()).toEqual(['one', 'two'])
  })
})
