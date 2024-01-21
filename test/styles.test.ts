import { promises as fs } from 'node:fs'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { StylesLang } from '../src/types'
import { getPath } from './helper/path'
import { buildVite } from './helper/build'

beforeAll(async () => {
  for (const style of ['scss', 'less', 'styl']) {
    const filename = getPath(`./fixtures/basic/styles/spritemap.${style}`)
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
  }
})

describe('styles generation', () => {
  for (const style of ['css', 'scss', 'less', 'styl']) {
    it(style, async () => {
      const filename = getPath(`./fixtures/basic/styles/spritemap.${style}`)

      await buildVite({
        name: `styles_gen_string_${style}`,
        options: {
          styles: filename,
        },
      })

      const resultWithString = await fs.readFile(filename, 'utf8')
      expect(resultWithString).toMatchSnapshot()

      await buildVite({
        name: `styles_gen_obj_${style}`,
        options: {
          styles: {
            filename,
            lang: style as StylesLang,
          },
        },
      })

      const resultWithObject = await fs.readFile(filename, 'utf8')
      expect(resultWithString).toBe(resultWithObject)
    })
  }

  it('test with warn', async () => {
    const spy = vi.spyOn(console, 'warn')
    await buildVite({
      name: `styles_gen_warn`,
      options: {
        styles: getPath('./fixtures/basic/styles/spritemap'),
      },
    })
    const calls = spy.mock.calls[0]
    expect(calls).toStrictEqual([
      '[vite-plugin-spritemap]',
      'Invalid styles lang, fallback to css',
    ])
  })
})
