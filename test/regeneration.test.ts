import type { ResolvedConfig } from 'vite'
import { promises as fsp } from 'node:fs'
import svgToMiniDataURI from 'mini-svg-data-uri'
import { createLogger } from 'vite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { SVGManager } from '../src/core/svgManager'
import { createOptions } from '../src/helpers/options'
import { getPath } from './helpers/path'

vi.mock('mini-svg-data-uri', async (importOriginal) => {
  // the package types use `export =`, but vitest's ESM interop serves it as a default export
  const mod = await importOriginal<{ default: typeof svgToMiniDataURI }>()
  return { default: vi.fn(mod.default) }
})

const root = getPath('./fixtures/regeneration')
const iconsDir = `${root}/svg`
const stylesPath = `${root}/out/spritemap.css`
const typesPath = `${root}/out/icons.ts`

function icon(fill: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path fill="${fill}" d="M0 0h10v10z"/></svg>`
}

function createManager(stylesFilename = 'out/spritemap.css') {
  // Only `root` and `logger` are ever read
  const config = {
    root,
    logger: createLogger('silent'),
  } as unknown as ResolvedConfig

  const { options } = createOptions({
    svgo: false,
    oxvg: false,
    styles: stylesFilename,
    types: 'out/icons.ts',
  })

  return new SVGManager(`${iconsDir}/*.svg`, options, config, '/__spritemap')
}

beforeAll(async () => {
  await fsp.mkdir(iconsDir, { recursive: true })
  for (const name of ['one', 'two', 'three'])
    await fsp.writeFile(`${iconsDir}/${name}.svg`, icon('red'), 'utf8')
})

afterAll(async () => {
  await fsp.rm(root, { recursive: true, force: true })
})

describe('regeneration on HMR updates', () => {
  it('skips the style/type writes when their content is unchanged', async () => {
    const manager = createManager()
    const spy = vi.spyOn(fsp, 'writeFile')
    const writesTo = (path: string) =>
      spy.mock.calls.filter(([target]) => String(target) === path).length

    await manager.updateAll()
    expect(writesTo(stylesPath)).toBe(1)
    expect(writesTo(typesPath)).toBe(1)

    // same icon content: nothing to rewrite
    spy.mockClear()
    await manager.update(`${iconsDir}/one.svg`, 'update')
    expect(writesTo(stylesPath)).toBe(0)
    expect(writesTo(typesPath)).toBe(0)

    // changed icon content: styles change, but the ids (and so the types) do not
    await fsp.writeFile(`${iconsDir}/one.svg`, icon('blue'), 'utf8')
    spy.mockClear()
    await manager.update(`${iconsDir}/one.svg`, 'update')
    expect(writesTo(stylesPath)).toBe(1)
    expect(writesTo(typesPath)).toBe(0)

    spy.mockRestore()
  })

  it('re-encodes only the changed icon, not the whole set', async () => {
    const manager = createManager()
    await manager.updateAll()

    vi.mocked(svgToMiniDataURI).mockClear()
    await manager.update(`${iconsDir}/two.svg`, 'update')
    expect(svgToMiniDataURI).toHaveBeenCalledTimes(1)
  })

  it('reads the style template from disk only once per language', async () => {
    const manager = createManager('out/spritemap.scss')
    await manager.updateAll()

    const spy = vi.spyOn(fsp, 'readFile')
    await manager.update(`${iconsDir}/three.svg`, 'update')
    const templateReads = spy.mock.calls.filter(([target]) =>
      String(target).endsWith('template.scss'))
    expect(templateReads).toHaveLength(0)

    spy.mockRestore()
  })
})
