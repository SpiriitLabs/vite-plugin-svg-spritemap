import { describe, expect, it } from 'vitest'
import { parseSvgQuery } from '../src/helpers/svgQuery'

describe('parseSvgQuery', () => {
  it.each([
    ['/icons/x.svg?use', 'use'],
    ['/icons/x.svg?view', 'view'],
    // Vite appends its own params: HMR timestamps, SFC lang markers, ?import
    ['/icons/x.svg?use&t=1699999999', 'use'],
    ['/icons/x.svg?view&lang.js', 'view'],
    ['/icons/x.svg?use&import', 'use'],
    // read by key, so param order is irrelevant
    ['/icons/x.svg?t=1699999999&use', 'use'],
    ['/icons/x.svg?view&t=1699999999&import', 'view'],
    ['/icons/x.svg?use#sprite-x', 'use'],
  ])('%s requests the %s component', (id, query) => {
    expect(parseSvgQuery(id)).toEqual({ path: '/icons/x.svg', query })
  })

  it.each([
    '/icons/x.svg',
    '/icons/x.svg?',
    '/icons/x.svg?raw',
    '/icons/x.svg?url',
    '/icons/x.svg?t=1699999999',
    '/icons/x.png?use',
    '/icons/use.svg',
  ])('%s is not a component id', (id) => {
    expect(parseSvgQuery(id)).toBeNull()
  })
})
