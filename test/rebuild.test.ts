import type { ResolvedConfig } from 'vite'
import { promises as fsp } from 'node:fs'
import { createLogger } from 'vite'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { SVGManager } from '../src/core/svgManager'
import { createOptions } from '../src/helpers/options'
import { getPath } from './helpers/path'

const root = getPath('./fixtures/rebuild')

function icon(size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><path d="M0 0h1v1H0z"/></svg>`
}

// One directory per test, so the file mutations below cannot leak between them
let seeded = 0
async function seed(names: string[]): Promise<string> {
  const dir = `${root}/svg-${seeded++}`
  await fsp.mkdir(dir, { recursive: true })
  for (const name of names)
    await fsp.writeFile(`${dir}/${name}.svg`, icon(10), 'utf8')
  return dir
}

function createManager(dir: string) {
  // Only `root` and `logger` are ever read
  const config = {
    root,
    logger: createLogger('silent'),
  } as unknown as ResolvedConfig

  // No optimizer, and `styles`/`types` default off, so nothing is written
  const { options } = createOptions({ svgo: false, oxvg: false })

  return {
    manager: new SVGManager(`${dir}/*.svg`, options, config, '/__spritemap'),
    logger: config.logger,
  }
}

afterAll(async () => {
  await fsp.rm(root, { recursive: true, force: true })
})

describe('updateAll on an already-populated manager', () => {
  it('drops icons deleted since the previous run', async () => {
    const dir = await seed(['a', 'b'])
    const { manager } = createManager(dir)

    await manager.updateAll()
    expect(manager.spritemap).toContain('sprite-b')

    await fsp.rm(`${dir}/b.svg`)
    await manager.updateAll()

    expect(manager.svgs.size).toBe(1)
    expect(manager.spritemap).toContain('sprite-a')
    expect(manager.spritemap).not.toContain('sprite-b')
  })

  it('does not warn about an id colliding with its own stale entry', async () => {
    const dir = await seed(['a', 'b'])
    const { manager, logger } = createManager(dir)
    await manager.updateAll()

    const spy = vi.spyOn(logger, 'warn')
    await manager.updateAll()

    expect(spy).not.toHaveBeenCalled()
  })

  it('still warns when two icons in the same run share an id', async () => {
    const dir = await seed(['a'])
    await fsp.mkdir(`${dir}/nested`, { recursive: true })
    await fsp.writeFile(`${dir}/nested/a.svg`, icon(20), 'utf8')

    const { manager, logger } = createManager(`${dir}/**`)
    const spy = vi.spyOn(logger, 'warn')

    await manager.updateAll()
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('has the same id (a)'))
  })
})
