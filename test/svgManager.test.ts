import type { ResolvedConfig } from 'vite'
import { DOMParser } from '@xmldom/xmldom'
import hash_sum from 'hash-sum'
import { createLogger } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { SVGManager } from '../src/core/svgManager'
import { createOptions } from '../src/helpers/options'
import { getPath } from './helpers/path'

// Sorts before `flags/`, so a create appends it last but `_sortSvgs()` moves
// it first. Outside the glob, so nothing needs writing to disk.
const createdPath = getPath('./fixtures/basic/broken/valid.svg')

function createManager() {
  // Only `root` and `logger` are ever read off the resolved config.
  const config = {
    root: getPath('./fixtures/basic'),
    logger: createLogger('silent'),
  } as unknown as ResolvedConfig

  // No optimizer, and `styles`/`types` default to `false` — writes no files.
  const { options } = createOptions({ svgo: false, oxvg: false })

  return new SVGManager(
    getPath('./fixtures/basic/flags/*.svg'),
    options,
    config,
    '/__spritemap',
  )
}

describe('sVGManager', () => {
  it('keeps the cache-busting hash in sync with the served spritemap', async () => {
    const manager = createManager()
    await manager.updateAll()
    expect(manager.hash).toBe(hash_sum(manager.spritemap))

    // Create reorders the set — the hash used to be computed before the sort.
    await manager.update(createdPath, 'create')
    expect(manager.spritemap.indexOf('sprite-valid'))
      .toBeLessThan(manager.spritemap.indexOf('sprite-CH'))
    expect(manager.hash).toBe(hash_sum(manager.spritemap))

    await manager.update(createdPath, 'update')
    expect(manager.hash).toBe(hash_sum(manager.spritemap))

    await manager.delete(createdPath)
    expect(manager.spritemap).not.toContain('sprite-valid')
    expect(manager.hash).toBe(hash_sum(manager.spritemap))
  })

  it('generates the spritemap once per icon-set change', async () => {
    const manager = createManager()
    const spy = vi.spyOn(DOMParser.prototype, 'parseFromString')
    await manager.updateAll()

    const first = manager.spritemap
    spy.mockClear()

    // Re-reading parses nothing, and the hash reuses the cached string.
    expect(manager.spritemap).toBe(first)
    expect(spy).not.toHaveBeenCalled()
    expect(manager.hash).toBe(hash_sum(first))
    expect(spy).not.toHaveBeenCalled()

    await manager.update(createdPath, 'create')
    // Ignore the single parse `_extractSvgDimensions` does on the new file.
    spy.mockClear()

    const next = manager.spritemap
    expect(spy).toHaveBeenCalled()
    expect(next).not.toBe(first)
    expect(next).toContain('sprite-valid')

    spy.mockRestore()
  })
})
