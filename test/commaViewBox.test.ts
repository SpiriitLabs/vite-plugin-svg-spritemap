import { describe, expect, it, vi } from 'vitest'
import { buildVite } from './helpers/build'

describe('comma-separated viewBox', () => {
  it('accepts comma-wsp separators instead of skipping the icon', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await buildVite({
      name: 'comma-viewbox',
      path: './fixtures/basic/comma-viewbox/*.svg',
      options: { svgo: false, oxvg: false },
    })

    expect('output' in result).toBe(true)
    if (!('output' in result))
      return

    // neither icon is treated as dimensionless
    const skipped = spy.mock.calls.some(call =>
      call.some(arg => typeof arg === 'string' && arg.includes('was skipped')),
    )
    expect(skipped).toBe(false)

    const asset = result.output.find(
      asset =>
        asset.name?.startsWith('spritemap.') && asset.name.endsWith('.svg'),
    )
    expect(asset).toBeDefined()
    if (asset && 'source' in asset) {
      const source = String(asset.source)
      const symbolViewBox = (id: string) =>
        new RegExp(`<symbol id="sprite-${id}" viewBox="([^"]+)"`).exec(source)?.[1]

      // both files declare the same box, one comma-separated, one comma-space
      expect(symbolViewBox('comma')).toBe('0 0 32 32')
      expect(symbolViewBox('comma_space')).toBe('0 0 32 32')
    }

    spy.mockRestore()
  })
})
