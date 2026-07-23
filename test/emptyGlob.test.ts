import { describe, expect, it, vi } from 'vitest'
import { buildVite } from './helpers/build'

describe('empty glob', () => {
  it('warns and still completes the build when the pattern matches no files', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await buildVite({
      name: 'empty-glob',
      path: './fixtures/basic/does-not-exist/*.svg',
      options: { svgo: false, oxvg: false },
    })

    // build completed instead of silently producing an empty spritemap
    expect('output' in result).toBe(true)

    // a warning tells the user their glob matched nothing
    const warned = spy.mock.calls.some(call =>
      call.some(arg =>
        typeof arg === 'string' && arg.includes('No SVG files found'),
      ),
    )
    expect(warned).toBe(true)

    spy.mockRestore()
  })
})
