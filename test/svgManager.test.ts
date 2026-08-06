import type { Glob } from 'picomatch'
import type { ResolvedConfig } from 'vite'
import type { UserOptions } from '../src/types'
import { DOMParser } from '@xmldom/xmldom'
import { createLogger } from 'vite'
import { describe, expect, it, vi } from 'vitest'
import { SVGManager } from '../src/core/svgManager'
import { hashContent } from '../src/helpers/hash'
import { createOptions } from '../src/helpers/options'
import { getPath } from './helpers/path'

// Sorts before `flags/`, so a create must be reordered. Outside the glob.
const createdPath = getPath('./fixtures/basic/broken/valid.svg')

function createManager(
  overrides: UserOptions = {},
  pattern: Glob = getPath('./fixtures/basic/flags/*.svg'),
) {
  // Only `root` and `logger` are ever read
  const config = {
    root: getPath('./fixtures/basic'),
    logger: createLogger('silent'),
  } as unknown as ResolvedConfig

  // No optimizer, and `styles`/`types` default off, so nothing is written
  const { options } = createOptions({ svgo: false, oxvg: false, ...overrides })

  return {
    manager: new SVGManager(pattern, options, config, '/__spritemap'),
    logger: config.logger,
  }
}

describe('sVGManager', () => {
  it('keeps the cache-busting hash in sync with the served spritemap', async () => {
    const { manager } = createManager()
    await manager.updateAll()
    expect(manager.hash).toBe(hashContent(manager.spritemap))

    // The hash used to be computed before the sort
    await manager.update(createdPath, 'create')
    expect(manager.spritemap.indexOf('sprite-valid'))
      .toBeLessThan(manager.spritemap.indexOf('sprite-CH'))
    expect(manager.hash).toBe(hashContent(manager.spritemap))

    await manager.update(createdPath, 'update')
    expect(manager.hash).toBe(hashContent(manager.spritemap))

    await manager.delete(createdPath)
    expect(manager.spritemap).not.toContain('sprite-valid')
    expect(manager.hash).toBe(hashContent(manager.spritemap))
  })

  it('generates the spritemap once per icon-set change', async () => {
    const { manager } = createManager()
    const spy = vi.spyOn(DOMParser.prototype, 'parseFromString')
    await manager.updateAll()

    const first = manager.spritemap
    spy.mockClear()

    expect(manager.spritemap).toBe(first)
    expect(spy).not.toHaveBeenCalled()
    expect(manager.hash).toBe(hashContent(first))
    expect(spy).not.toHaveBeenCalled()

    await manager.update(createdPath, 'create')
    // Ignore the parse `_extractSvgDimensions` does on the new file
    spy.mockClear()

    const next = manager.spritemap
    expect(spy).toHaveBeenCalled()
    expect(next).not.toBe(first)
    expect(next).toContain('sprite-valid')

    spy.mockRestore()
  })

  it('returns false and logs an error when the file cannot be read', async () => {
    const { manager, logger } = createManager()
    const spy = vi.spyOn(logger, 'error')

    await expect(manager.update(getPath('./fixtures/basic/flags/missing.svg'))).resolves.toBe(false)
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Failed to read file'))
  })

  it('returns false when deleting a file it does not manage', async () => {
    const { manager } = createManager()
    await expect(manager.delete(getPath('./fixtures/basic/flags/missing.svg'))).resolves.toBe(false)
  })

  it('warns with the joined patterns when an array glob matches nothing', async () => {
    const patterns = [
      getPath('./fixtures/basic/does-not-exist/*.svg'),
      getPath('./fixtures/basic/does-not-exist-either/*.svg'),
    ]
    const { manager, logger } = createManager({}, patterns)
    const spy = vi.spyOn(logger, 'warn')

    await manager.updateAll()
    expect(spy).toHaveBeenCalledWith(expect.stringContaining(patterns.join(', ')))
  })

  it('keeps the original source and warns when the optimizer throws', async () => {
    const { manager, logger } = createManager({
      svgo: {
        plugins: [{
          name: 'boom',
          fn: () => {
            throw new Error('boom')
          },
        }],
      },
    })
    const spy = vi.spyOn(logger, 'warn')

    await manager.updateAll()
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('SVGO optimization failed'))
    expect(manager.svgs.size).toBeGreaterThan(0)
  })

  it('logs a processing error when an icon rejects during updateAll', async () => {
    const { manager, logger } = createManager({
      idify: () => {
        throw new Error('boom')
      },
    })
    const spy = vi.spyOn(logger, 'error')

    await manager.updateAll()
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Failed to process'))
  })

  it('logs instead of throwing when the style and type files cannot be written', async () => {
    // nested under `index.html`, a file, so mkdir fails
    const { manager, logger } = createManager({
      styles: 'index.html/nested/spritemap.css',
      types: 'index.html/nested/spritemap.d.ts',
    })
    const spy = vi.spyOn(logger, 'error')

    await manager.updateAll()
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Failed to create style file'))
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Failed to create type file'))
  })
})
