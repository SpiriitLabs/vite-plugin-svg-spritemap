import { describe, expect, it, vi } from 'vitest'
import { buildVite } from './helpers/build'

describe('svg skipped for missing dimensions', () => {
  it('warns (naming the file) when an icon has neither a usable viewBox nor width/height', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Default `svg/*.svg` glob already includes `no_viewbox_width_height.svg`
    // (no viewBox, no width/height) and `invalid_viewbox.svg` (viewBox="0 0 0 0").
    const result = await buildVite({
      name: 'missing-dimensions',
      options: { svgo: false, oxvg: false },
    })

    expect('output' in result).toBe(true)
    if (!('output' in result))
      return

    const skipped = (file: string) =>
      spy.mock.calls.some(call =>
        call.some(arg =>
          typeof arg === 'string'
          && arg.includes('was skipped')
          && arg.includes(file),
        ),
      )

    // both silent-drop cases now warn, naming the offending file
    expect(skipped('no_viewbox_width_height')).toBe(true)
    expect(skipped('invalid_viewbox')).toBe(true)

    // valid icons are still emitted, the skipped ones are dropped
    const asset = result.output.find(
      asset =>
        asset.name?.startsWith('spritemap.') && asset.name.endsWith('.svg'),
    )
    expect(asset).toBeDefined()
    if (asset && 'source' in asset) {
      expect(asset.source).toContain('spiriit')
      expect(asset.source).not.toContain('no_viewbox_width_height')
      expect(asset.source).not.toContain('invalid_viewbox')
    }

    spy.mockRestore()
  })
})
