import type {
  Options,
  OptionsOutput,
  OptionsRoute,
  OptionsStyles,
  OptionsStylesNames,
  OptionsStylesSizes,
  OptionsTypes,
  OptionsVariables,
  SpritemapGenerator,
  StylesCallback,
  StylesCallbackContext,
  StylesInclude,
  StylesLang,
  SvgDataUriMapObject,
  SvgMapObject,
  SvgVariables,
  TypesConfig,
  TypesOptions,
  UserOptions,
  VariablesSpritemapMode,
} from '../src/index'
import { describe, expect, expectTypeOf, it } from 'vitest'

/** Imported from the entry point as a consumer does: a dropped export fails `pnpm typecheck` here. */
describe('public types', () => {
  it('types a config the way a consumer writes one', () => {
    const options: UserOptions = {
      prefix: 'icon-',
      variables: { spritemap: 'resolve' },
      types: { filename: 'src/spritemap.d.ts', groups: { Ui: './icons/ui/*.svg' } },
      styles: {
        filename: 'src/spritemap.scss',
        include: ['variables', 'mixin'],
        names: { variables: 'themes' },
        sizes: { unit: 'rem', base: 16 },
      },
    }

    expect(options.prefix).toBe('icon-')
  })

  // inline they infer, extracted to a named function they do not
  it('types an extracted styles.callback and idify', () => {
    const callback: StylesCallback = ctx =>
      ctx.createSpritemap(svg => `${svg.id}${svg.svgDataUriTemplate ?? ''}`)

    const idify = (name: string, svg: Omit<SvgMapObject, 'id'>): string =>
      `${name}-${svg.viewBox.join('-')}${svg.variables ? '-themed' : ''}`

    const options: UserOptions = { styles: { filename: 'a.scss', callback }, idify }

    expect(typeof options.idify).toBe('function')
  })

  it('exposes the enum-like options as closed unions', () => {
    expectTypeOf<VariablesSpritemapMode>().toEqualTypeOf<'preserve' | 'resolve'>()
    expectTypeOf<StylesLang>().toEqualTypeOf<'less' | 'scss' | 'styl' | 'css'>()
    expectTypeOf<StylesInclude>().toEqualTypeOf<'variables' | 'mixin' | 'bg' | 'mask' | 'bg-frag'>()
    expectTypeOf<OptionsVariables['spritemap']>().toEqualTypeOf<VariablesSpritemapMode>()
    expectTypeOf<OptionsOutput['hrefAttribute']>().toEqualTypeOf<'xlink:href' | 'href' | 'both'>()
  })

  it('reaches the remaining resolved shapes by name', () => {
    expectTypeOf<Options['styles']>().toEqualTypeOf<OptionsStyles | false>()
    expectTypeOf<Options['route']>().toEqualTypeOf<OptionsRoute>()
    expectTypeOf<Options['types']>().toEqualTypeOf<OptionsTypes | false>()
    expectTypeOf<OptionsStyles['names']>().toEqualTypeOf<OptionsStylesNames>()
    expectTypeOf<OptionsStyles['sizes']>().toEqualTypeOf<OptionsStylesSizes>()
    expectTypeOf<SvgMapObject['variables']>().toEqualTypeOf<SvgVariables | undefined>()
    expectTypeOf<TypesOptions>().toEqualTypeOf<TypesConfig | string | false>()
    expectTypeOf<OptionsStyles['callback']>().toEqualTypeOf<StylesCallback | undefined>()
    expectTypeOf<StylesCallbackContext['createSpritemap']>()
      .toEqualTypeOf<(generator: SpritemapGenerator) => string>()
    expectTypeOf<SpritemapGenerator>()
      .toEqualTypeOf<(svg: SvgDataUriMapObject, isLast: boolean) => string>()

    expect(true).toBe(true)
  })
})
