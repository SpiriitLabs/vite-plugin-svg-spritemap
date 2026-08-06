import type { SvgMapObject } from '../src/types'
import { promises as fs } from 'node:fs'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { Types } from '../src/core/types'
import { logMessage } from '../src/helpers/log'
import { createOptions } from '../src/helpers/options'
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

  it('generates the same output for the object form without groups', async () => {
    const stringFilename = getPath('./fixtures/basic/types/spritemap_object_string.d.ts')
    const objectFilename = getPath('./fixtures/basic/types/spritemap_object_no_groups.d.ts')

    await buildVite({
      name: 'types_object_string',
      options: {
        types: stringFilename,
      },
    })
    await buildVite({
      name: 'types_object_no_groups',
      options: {
        // object form without `groups` behaves like the string form
        types: { filename: objectFilename },
      },
    })

    const stringResult = await fs.readFile(stringFilename, 'utf8')
    const objectResult = await fs.readFile(objectFilename, 'utf8')
    expect(objectResult).toBe(stringResult)
    expect(objectResult).not.toContain('export type UiIcons')
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
    const spy = vi.spyOn(console, 'warn')

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
    expect(spy).toHaveBeenCalledWith(
      logMessage('Type group "Icons" collides with the reserved type "Icons" and was skipped.'),
    )
    spy.mockRestore()
  })

  it('skips a group whose name is not a valid TypeScript type name', async () => {
    const filename = getPath('./fixtures/basic/types/spritemap_groups_invalid.d.ts')
    const spy = vi.spyOn(console, 'warn')

    await buildVite({
      name: 'types_groups_invalid',
      options: {
        types: {
          filename,
          groups: {
            'my-icons': 'svg/*.svg',
          },
        },
      },
    })

    const result = await fs.readFile(filename, 'utf8')
    expect(result).not.toContain('my-icons')
    expect(spy).toHaveBeenCalledWith(
      logMessage('Type group "my-icons" is not a valid TypeScript type name and was skipped.'),
    )
    spy.mockRestore()
  })
})

describe('types class', () => {
  const root = getPath('./fixtures/basic')

  function svgEntry(id: string, filePath: string): [string, SvgMapObject] {
    return [filePath, { id, filePath, width: 1, height: 1, viewBox: [0, 0, 1, 1], source: '<svg/>' }]
  }

  it('returns an empty string when types generation is disabled', () => {
    const { options } = createOptions({ types: false })
    expect(new Types(new Map(), options, root).generate()).toBe('')
  })

  it('sorts ids deterministically, duplicates included', () => {
    const { options } = createOptions({ types: 'spritemap.d.ts' })
    // unsorted with a duplicated id to hit every comparator outcome
    const svgs = new Map<string, SvgMapObject>([
      svgEntry('b', `${root}/svg/b.svg`),
      svgEntry('a', `${root}/svg/a2.svg`),
      svgEntry('a', `${root}/svg/a1.svg`),
    ])

    const result = new Types(svgs, options, root).generate()
    expect(result).toContain('export type Icons = \'a\' | \'a\' | \'b\';')
  })
})
