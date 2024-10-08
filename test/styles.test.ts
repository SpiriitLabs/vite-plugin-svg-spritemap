import type { OptionsStyles, StylesLang } from '../src/types'
import { promises as fs } from 'node:fs'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { buildVite } from './helper/build'
import { getPath } from './helper/path'

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

const styleLanguages: Array<OptionsStyles['lang']> = ['css', 'scss', 'less', 'styl']

const otherStylesIncludes: Array<OptionsStyles['include']> = [
  true,
  false,
  ['mixin'],
  ['mixin', 'variables'],
]

const styleIncludes: Record<OptionsStyles['lang'], Array<OptionsStyles['include']>> = {
  css: [
    true,
    false,
    ['bg'],
    ['bg', 'mask'],
  ],
  less: otherStylesIncludes,
  scss: otherStylesIncludes,
  styl: otherStylesIncludes,
}

describe('styles generation', () => {
  for (const style of styleLanguages) {
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

  for (const lang in styleIncludes) {
    if (Object.prototype.hasOwnProperty.call(styleIncludes, lang)) {
      const includes = styleIncludes[lang]
      for (const include of includes) {
        it(`include ${lang} ${JSON.stringify(include)}`, async () => {
          const includePath = Array.isArray(include) ? include.join('_') : include
          const filename = getPath(`./fixtures/basic/styles/spritemap_include_${includePath}.${lang}`)

          await buildVite({
            name: `styles_includeMixin`,
            options: {
              styles: {
                filename,
                include,
              },
            },
          })

          const resultWithString = await fs.readFile(filename, 'utf8')
          expect(resultWithString).toMatchSnapshot()
        })
      }
    }
  }

  for (const style of styleLanguages.filter(style => style !== 'css')) {
    it(`custom ${style} names`, async () => {
      const filename = getPath(`./fixtures/basic/styles/spritemap_names.${style}`)

      await buildVite({
        name: `styles_names`,
        options: {
          styles: {
            filename,
            names: {
              sprites: 'icons',
              prefix: 'icon-prefix',
              mixin: 'icon-sprite',
            },
          },
        },
      })

      const resultWithString = await fs.readFile(filename, 'utf8')
      expect(resultWithString).toMatchSnapshot()
    })
  }

  it('styles callback', async () => {
    const filename = getPath(`./fixtures/basic/styles/spritemap_callback.css`)

    await buildVite({
      name: `styles_callback`,
      options: {
        styles: {
          filename,
          callback: ({ content, options, createSpritemap }) => {
            let insert = ''
            insert += createSpritemap((name, svg) => {
              const selector = `.${options.prefix}${name}`
              let sprite = ''
              sprite = `${selector} {`
              sprite += `\n\tbackground: url("${svg.svgDataUri}") center no-repeat!important;`
              sprite += '\n}'
              return sprite
            })

            content = `/* Route with ${options.route}*/ \n${insert}`
            return content
          },
        },
      },
    })

    const resultWithString = await fs.readFile(filename, 'utf8')
    expect(resultWithString).toMatchSnapshot()
  })

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
