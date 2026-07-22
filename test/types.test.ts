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
})
