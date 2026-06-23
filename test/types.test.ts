import { promises as fs } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildVite } from './helpers/build'
import { getPath } from './helpers/path'

beforeAll(async () => {
  const filename = getPath('./fixtures/basic/types/spritemap.d.ts')
  let exist = false
  try {
    await fs.access(filename)
    exist = true
  }
  catch {
    exist = false
  }
  if (exist)
    await fs.writeFile(filename, '')
})

describe('types generation', () => {
  it('generates types with string filename', async () => {
    const filename = getPath('./fixtures/basic/types/spritemap_string.d.ts')
    await buildVite({
      name: 'types_gen_string',
      options: {
        types: filename,
      },
    })

    const result = await fs.readFile(filename, 'utf8')
    expect(result).toMatchSnapshot()
  })

  it('generates types with different prefix', async () => {
    const filename = getPath('./fixtures/basic/types/spritemap_prefix.d.ts')

    await buildVite({
      name: 'types_prefix',
      options: {
        types: filename,
        prefix: 'icon-',
      },
    })

    const result = await fs.readFile(filename, 'utf8')
    expect(result).toMatchSnapshot()
  })

  it('generates types with no prefix', async () => {
    const filename = getPath('./fixtures/basic/types/spritemap_no_prefix.d.ts')

    await buildVite({
      name: 'types_no_prefix',
      options: {
        types: filename,
        prefix: false,
      },
    })

    const result = await fs.readFile(filename, 'utf8')
    expect(result).not.toContain('Prefix')
    expect(result).not.toContain('IconsPrefixed')
    expect(result).toMatchSnapshot()
  })

  it('generates types with custom idify', async () => {
    const filename = getPath('./fixtures/basic/types/spritemap_idify.d.ts')

    await buildVite({
      name: 'types_idify',
      options: {
        types: filename,
        idify: name => `custom-${name}`,
      },
    })

    const result = await fs.readFile(filename, 'utf8')
    expect(result).toMatchSnapshot()
  })

  it('generates types with .ts extension', async () => {
    const filename = getPath('./fixtures/basic/types/spritemap_ts.ts')

    await buildVite({
      name: 'types_ts_extension',
      options: {
        types: filename,
      },
    })

    const result = await fs.readFile(filename, 'utf8')
    expect(result).toMatchSnapshot()
  })

  it('does not generate types when types is false', async () => {
    const filename = getPath('./fixtures/basic/types/spritemap_false.d.ts')

    await buildVite({
      name: 'types_false',
      options: {
        types: false,
      },
    })

    let fileExists = false
    try {
      await fs.access(filename)
      fileExists = true
    }
    catch {
      fileExists = false
    }

    expect(fileExists).toBe(false)
  })

  it('generates empty type when no icons', async () => {
    const filename = getPath('./fixtures/basic/types/spritemap_empty.d.ts')

    await buildVite({
      name: 'types_empty',
      path: './fixtures/basic/empty/*.svg',
      options: {
        types: filename,
      },
    })

    const result = await fs.readFile(filename, 'utf8')
    expect(result).toMatchSnapshot()
  })

  it('generates grouped types from glob-matched folders', async () => {
    const filename = getPath('./fixtures/basic/types/spritemap_groups.d.ts')

    await buildVite({
      name: 'types_groups',
      path: './fixtures/basic/{svg,flags}/*.svg',
      options: {
        types: {
          filename,
          groups: {
            UiIcons: 'svg/*.svg',
            Flags: 'flags/*.svg',
          },
        },
      },
    })

    const result = await fs.readFile(filename, 'utf8')
    // Global `Icons` stays the full set, groups are subsets.
    expect(result).toContain('export type Icons =')
    expect(result).toContain('export type UiIcons =')
    expect(result).toContain('export type Flags = \'CH\' | \'FR\' | \'JP\';')
    expect(result).toMatchSnapshot()
  })

  it('supports an array of globs for a single group', async () => {
    const filename = getPath('./fixtures/basic/types/spritemap_groups_array.d.ts')

    await buildVite({
      name: 'types_groups_array',
      path: './fixtures/basic/{svg,flags}/*.svg',
      options: {
        types: {
          filename,
          groups: {
            Mixed: ['svg/vite.svg', 'flags/*.svg'],
          },
        },
      },
    })

    const result = await fs.readFile(filename, 'utf8')
    expect(result).toContain('export type Mixed = \'CH\' | \'FR\' | \'JP\' | \'vite\';')
    expect(result).toMatchSnapshot()
  })

  it('resolves a group that matches no icons to never', async () => {
    const filename = getPath('./fixtures/basic/types/spritemap_groups_empty.d.ts')

    await buildVite({
      name: 'types_groups_empty',
      options: {
        types: {
          filename,
          groups: {
            Missing: 'does-not-exist/*.svg',
          },
        },
      },
    })

    const result = await fs.readFile(filename, 'utf8')
    expect(result).toContain('export type Missing = never;')
    expect(result).toMatchSnapshot()
  })

  it('skips a group that collides with a reserved type name', async () => {
    const filename = getPath('./fixtures/basic/types/spritemap_groups_reserved.d.ts')

    await buildVite({
      name: 'types_groups_reserved',
      options: {
        types: {
          filename,
          groups: {
            // reserved -> skipped, so `Icons` stays declared exactly once
            Icons: 'svg/*.svg',
          },
        },
      },
    })

    const result = await fs.readFile(filename, 'utf8')
    expect(result.match(/export type Icons =/g)).toHaveLength(1)
  })
})
