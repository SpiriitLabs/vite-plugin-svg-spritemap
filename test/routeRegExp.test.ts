import { describe, expect, it } from 'vitest'
import {
  createRouteFilterRegExp,
  createRouteImportRegExp,
  createRouteRegExp,
} from '../src/helpers/routeRegExp'
import { buildVite } from './helpers/build'

const ROUTE = '/__spritemap'
// The options the build transform passes (build.ts)
const buildOpts = { dot: true, numbered: false } as const

describe('createRouteRegExp', () => {
  const siblingRoutes = [`${ROUTE}-docs`, `${ROUTE}-flags`, `${ROUTE}x`, `${ROUTE}_alt`]

  it('is global, so replace() rewrites every occurrence', () => {
    expect(createRouteRegExp(ROUTE).global).toBe(true)
    expect(`${ROUTE}#a and ${ROUTE}#b`.replace(createRouteRegExp(ROUTE), 'X'))
      .toBe('X#a and X#b')
  })

  it('matches every real reference form', () => {
    const cases: [string, string][] = [
      [ROUTE, 'X'],
      [`${ROUTE}#sprite-vite`, 'X#sprite-vite'],
      [`${ROUTE}?v=1`, 'X?v=1'],
      [`<use xlink:href="${ROUTE}#a"></use>`, '<use xlink:href="X#a"></use>'],
      [`url(${ROUTE}#a)`, 'url(X#a)'],
      [`background: url("${ROUTE}#a") no-repeat`, 'background: url("X#a") no-repeat'],
    ]
    for (const [input, expected] of cases)
      expect(input.replace(createRouteRegExp(ROUTE), 'X')).toBe(expected)
  })

  it('does not match inside a longer path segment', () => {
    const svelteId = 'svelte/internal/flags/async'
    expect(createRouteRegExp('/fla', buildOpts).test(svelteId)).toBe(false)
    // the rewrite that used to corrupt the specifier is now a no-op
    expect(svelteId.replace(createRouteRegExp('/fla', buildOpts), '/assets/sprite.svg'))
      .toBe(svelteId)
  })

  it('does not match a sibling route sharing the prefix', () => {
    for (const sibling of siblingRoutes) {
      expect(createRouteRegExp(ROUTE).test(sibling)).toBe(false)
      expect(createRouteRegExp(ROUTE, buildOpts).test(sibling)).toBe(false)
    }
  })

  it('does not match an asset nested under the route', () => {
    expect(createRouteRegExp('/icons', buildOpts).test('/icons/foo.png')).toBe(false)
  })

  it('does not match the already-hashed dev route', () => {
    expect(createRouteRegExp(ROUTE).test(`${ROUTE}__a1b2c3`)).toBe(false)
  })

  describe('dot', () => {
    it('swallows the leading dot by default', () => {
      expect(`.${ROUTE}#a`.replace(createRouteRegExp(ROUTE), 'X')).toBe('X#a')
    })

    it('keeps the leading dot when disabled', () => {
      expect(`.${ROUTE}#a`.replace(createRouteRegExp(ROUTE, { dot: false }), 'X'))
        .toBe('.X#a')
    })
  })

  describe('numbered', () => {
    it('consumes the legacy suffix by default', () => {
      expect(`${ROUTE}-123#a`.replace(createRouteRegExp(ROUTE), 'X')).toBe('X#a')
    })

    it('leaves the legacy suffix alone when disabled', () => {
      expect(createRouteRegExp(ROUTE, { numbered: false }).test(`${ROUTE}-123`)).toBe(false)
    })

    it('does not treat a non-numeric suffix as the legacy one', () => {
      expect(createRouteRegExp(ROUTE).test(`${ROUTE}-abc`)).toBe(false)
    })
  })

  it('treats regex metacharacters in the route literally', () => {
    expect(createRouteRegExp('/icons.svg').test('/icons.svg')).toBe(true)
    expect(createRouteRegExp('/icons.svg').test('/iconsXsvg')).toBe(false)
    expect(createRouteRegExp('/a+b').test('/a+b')).toBe(true)
    expect(createRouteRegExp('/a+b').test('/aab')).toBe(false)
  })
})

describe('createRouteImportRegExp', () => {
  const routeIds = [
    ROUTE,
    `${ROUTE}#sprite-vite`,
    `${ROUTE}?v=1`,
    `${ROUTE}?v=1#a`,
    `.${ROUTE}#a`,
  ]
  const lookalikeIds = [
    'svelte/internal/flags/async',
    `${ROUTE}-docs`,
    `${ROUTE}x`,
    `${ROUTE}/nested.png`,
    `src${ROUTE}`,
    'other-module',
  ]

  it('is not global, so repeated test() calls are stable', () => {
    const re = createRouteImportRegExp(ROUTE)
    expect(re.global).toBe(false)
    expect(re.test(ROUTE)).toBe(true)
    expect(re.test(ROUTE)).toBe(true)
  })

  it('matches a specifier that is the route', () => {
    for (const id of routeIds)
      expect(createRouteImportRegExp(ROUTE).test(id)).toBe(true)
  })

  it('rejects anything that merely contains the route', () => {
    for (const id of lookalikeIds)
      expect(createRouteImportRegExp(ROUTE).test(id)).toBe(false)
  })

  it('treats regex metacharacters in the route literally', () => {
    expect(createRouteImportRegExp('/icons.svg').test('/icons.svg')).toBe(true)
    expect(createRouteImportRegExp('/icons.svg').test('/iconsXsvg')).toBe(false)
  })
})

describe('createRouteFilterRegExp', () => {
  const modulesUsingRoute = [
    `export const href = '${ROUTE}#sprite-vite'`,
    `.icon { background: url("${ROUTE}#a"); }`,
    ROUTE,
  ]

  it('is not global, so repeated test() calls are stable', () => {
    // build.ts stores this one and calls test() per module
    const re = createRouteFilterRegExp(ROUTE)
    expect(re.global).toBe(false)
    expect(re.test(`href="${ROUTE}#a"`)).toBe(true)
    expect(re.test(`href="${ROUTE}#a"`)).toBe(true)
  })

  it('matches the route anywhere in a module', () => {
    for (const code of modulesUsingRoute)
      expect(createRouteFilterRegExp(ROUTE).test(code)).toBe(true)
  })

  it('stays deliberately loose, unlike the rewriting regexes', () => {
    // Only gates whether a rewrite is attempted, so over-matching is harmless
    expect(createRouteFilterRegExp(ROUTE).test(`${ROUTE}-docs`)).toBe(true)
    expect(createRouteFilterRegExp('/fla').test('svelte/internal/flags/async')).toBe(true)
  })

  it('does not match unrelated code', () => {
    expect(createRouteFilterRegExp(ROUTE).test('export const a = 1')).toBe(false)
  })

  it('treats regex metacharacters in the route literally', () => {
    expect(createRouteFilterRegExp('/icons.svg').test('/iconsXsvg')).toBe(false)
  })
})

// One build only: the regexes themselves are unit-tested above, so this just
// pins that `build.ts` feeds route.url through `createRouteImportRegExp`.
// Every buildVite() also parses the shared fixture CSS, which other suites
// rewrite concurrently, so extra builds here buy flakiness rather than cover.
describe('rollup external wiring', () => {
  it('externalizes the route but not unrelated modules', async () => {
    let external: unknown

    await buildVite({
      name: 'route_regexp_external',
      options: { route: '/fla', output: true },
      viteConfig: {
        plugins: [{
          name: 'read-config',
          configResolved(config) {
            external = config.build.rollupOptions.external
          },
        }],
      },
    })

    expect(external).toBeInstanceOf(RegExp)
    const re = external as RegExp
    expect(re.test('/fla')).toBe(true)
    expect(re.test('/fla#sprite-vite')).toBe(true)
    expect(re.test('svelte/internal/flags/async')).toBe(false)
    expect(re.test('/flags')).toBe(false)
  })
})
