import type { Glob } from 'picomatch'
import type { ResolvedConfig } from 'vite'
import type { UserOptions } from '../src/types'
import { promises as fs } from 'node:fs'
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

describe('sVGManager variables', () => {
  const mismatchPath = getPath('./fixtures/basic/variables/mismatch.svg')

  it('warns once per sprite across re-updates', async () => {
    const { manager, logger } = createManager({}, mismatchPath)
    const spy = vi.spyOn(logger, 'warn')

    await manager.updateAll()
    await manager.update(mismatchPath, 'update')
    await manager.update(mismatchPath, 'update')

    const conflicts = spy.mock.calls
      .flat()
      .filter(message => String(message).includes('Conflicting defaults'))

    expect(conflicts).toHaveLength(1)
  })

  it('warns again after the sprite was deleted and re-added', async () => {
    const { manager, logger } = createManager({}, mismatchPath)
    await manager.updateAll()

    const spy = vi.spyOn(logger, 'warn')
    await manager.delete(mismatchPath)
    await manager.update(mismatchPath, 'create')

    expect(spy.mock.calls.flat().filter(message => String(message).includes('Conflicting defaults'))).toHaveLength(1)
  })

  // the memo used to keep the last set, so re-adding the same mistake stayed silent
  it('warns again after the var() was removed and re-added', async () => {
    const iconPath = getPath('./fixtures/basic/broken/rewritten.svg')
    const broken = '<svg viewBox="0 0 10 10"><path fill="var(--c, red)" stroke="var(--c, blue)"/></svg>'
    const clean = '<svg viewBox="0 0 10 10"><path fill="red"/></svg>'
    const conflicts = (spy: ReturnType<typeof vi.spyOn>) =>
      spy.mock.calls.flat().filter(message => String(message).includes('Conflicting defaults')).length

    await fs.writeFile(iconPath, broken, 'utf8')
    try {
      const { manager, logger } = createManager({}, iconPath)
      const spy = vi.spyOn(logger, 'warn')

      await manager.updateAll()
      expect(conflicts(spy)).toBe(1)

      await fs.writeFile(iconPath, clean, 'utf8')
      await manager.update(iconPath, 'update')

      spy.mockClear()
      await fs.writeFile(iconPath, broken, 'utf8')
      await manager.update(iconPath, 'update')

      expect(conflicts(spy)).toBe(1)
    }
    finally {
      await fs.rm(iconPath, { force: true })
    }
  })

  // the uris are memoized against the `SvgMapObject`, which `update()` replaces
  it('re-emits both uris and the defaults map when an edit changes a default', async () => {
    const iconPath = getPath('./fixtures/basic/broken/edited.svg')
    const stylesPath = getPath('./fixtures/basic/styles/edited.scss')
    const icon = (color: string) =>
      `<svg viewBox="0 0 10 10"><path fill="var(--c, ${color})" d="M0 0h1v1H0z"/></svg>`

    await fs.writeFile(iconPath, icon('red'), 'utf8')
    try {
      const { manager } = createManager({ styles: { filename: stylesPath, lang: 'scss' } }, iconPath)

      await manager.updateAll()
      const before = await fs.readFile(stylesPath, 'utf8')
      expect(before).toContain('\'c\': "red"')
      expect(before).toContain('fill=\'red\'')
      expect(before).toContain('fill=\'___c___\'')

      await fs.writeFile(iconPath, icon('blue'), 'utf8')
      await manager.update(iconPath, 'update')

      const after = await fs.readFile(stylesPath, 'utf8')
      expect(after).toContain('\'c\': "blue"')
      expect(after).toContain('fill=\'blue\'')
      expect(after).not.toContain('fill=\'red\'')
      // the template is what the mixin substitutes into, and it must survive the edit
      expect(after).toContain('fill=\'___c___\'')
    }
    finally {
      await fs.rm(iconPath, { force: true })
      await fs.rm(stylesPath, { force: true })
    }
  })

  it('exposes the parsed defaults and the source template', async () => {
    const { manager } = createManager({}, getPath('./fixtures/basic/variables/themable.svg'))
    await manager.updateAll()

    const svg = manager.svgs.get(getPath('./fixtures/basic/variables/themable.svg'))

    expect(svg?.variables?.defaults).toEqual({ color: '#fff', weight: '2' })
    expect(svg?.variables?.sourceTemplate).toContain('fill="___color___"')
    // `preserve` is the default, so the spritemap keeps the authored var()
    expect(svg?.source).toContain('fill="var(--color, #fff)"')
  })
})
