import type { OptionsStyles, StylesLang } from '../src/types'
import { promises as fs } from 'node:fs'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { logMessage } from '../src/helpers/log'
import { buildVite } from './helpers/build'
import { getPath } from './helpers/path'

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
    ['bg-frag'],
    ['bg', 'mask', 'bg-frag'],
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
    if (Object.hasOwn(styleIncludes, lang)) {
      const includes = styleIncludes[lang as StylesLang]
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

  // https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/98
  // An SVG referencing an internal `url(#id)` (filter, gradient, clip-path…)
  // must not leave a `url(...)` token in the generated data URI, otherwise
  // downstream CSS tooling (Vite's url() rewriter, Sass) treats the encoded
  // `%23id` as an asset path, corrupting the data URI and breaking compilation.
  it.each(['scss', 'less', 'styl', 'css'] as const)(
    'encodes internal url() references in data uri (%s) #98',
    async (lang) => {
      const filename = getPath(`./fixtures/basic/styles/spritemap_filter.${lang}`)

      await buildVite({
        name: `styles_filter_${lang}`,
        path: './fixtures/basic/filter/*.svg',
        options: {
          styles: {
            filename,
            lang,
            include: lang === 'css' ? ['bg'] : ['variables'],
          },
        },
      })

      const result = await fs.readFile(filename, 'utf8')

      // The encoded reference is present…
      expect(result).toContain('url%28%23a%29')
      // …and no raw `url(` token survives inside the data uri to be picked up
      // by a CSS url() rewriter. The data uri is always wrapped in double
      // quotes (`uri: "…"` / `url("…")`) and only uses single quotes inside,
      // so delimit on the closing double quote.
      const dataUri = result.match(/data:image\/svg\+xml,[^"]+/)?.[0] ?? ''
      expect(dataUri).not.toContain('url(')

      // The data uri still round-trips to a valid internal `url(#a)` reference.
      expect(decodeURIComponent(dataUri)).toContain('url(#a)')
    },
  )

  it('styles callback', async () => {
    const filename = getPath(`./fixtures/basic/styles/spritemap_callback.css`)

    await buildVite({
      name: `styles_callback`,
      options: {
        styles: {
          filename,
          callback: ({ content, options, createSpritemap }) => {
            let insert = ''
            insert += createSpritemap((svg) => {
              const selector = `.${options.prefix + svg.id}`
              let sprite = ''
              sprite = `${selector} {`
              sprite += `\n\tbackground: url("${svg.svgDataUri}") center no-repeat!important;`
              sprite += '\n}'
              return sprite
            })

            content = `/* Route ${options.route.name}*/ \n${insert}`
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
    await buildVite({
      name: `styles_gen_warn`,
      options: {
        styles: {
          filename: getPath('./fixtures/basic/styles/spritemap'),
        },
      },
    })
    expect(spy.mock.calls).toContainEqual([
      logMessage('Invalid styles lang, fallback to css'),
    ])
  })

  for (const style of styleLanguages.filter(style => style !== 'css')) {
    it(`custom ${style} sizes with em unit`, async () => {
      const filename = getPath(`./fixtures/basic/styles/spritemap_sizes.${style}`)

      await buildVite({
        name: `styles_sizes_em_${style}`,
        options: {
          styles: {
            filename,
            sizes: {
              unit: 'em',
              base: 16,
            },
          },
        },
      })

      const resultWithString = await fs.readFile(filename, 'utf8')
      expect(resultWithString).toMatchSnapshot()
    })
  }

  for (const style of styleLanguages.filter(style => style !== 'css')) {
    it(`custom ${style} sizes with rem unit and base 10`, async () => {
      const filename = getPath(`./fixtures/basic/styles/spritemap_sizes_rem.${style}`)

      await buildVite({
        name: `styles_sizes_rem_${style}`,
        options: {
          styles: {
            filename,
            sizes: {
              unit: 'rem',
              base: 10,
            },
          },
        },
      })

      const resultWithString = await fs.readFile(filename, 'utf8')
      expect(resultWithString).toMatchSnapshot()
    })
  }
})
