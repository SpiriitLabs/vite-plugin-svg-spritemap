import { describe, expect, it } from 'vitest'
import { createOptions } from '../src/helpers/options'

describe('createOptions route', () => {
  it('derives the name from an object url without leading slash', () => {
    const { options, logs } = createOptions({ route: { url: '__icons' } })

    expect(options.route.name).toBe('__icons')
    expect(options.route.url).toBe('/__icons')
    expect(logs.warn).toContainEqual(expect.stringContaining('leading slash'))
  })
})
