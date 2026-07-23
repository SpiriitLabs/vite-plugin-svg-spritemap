import { describe, expect, it, vi } from 'vitest'
import { buildVite } from './helpers/build'

describe('malformed svg', () => {
  it('skips a malformed SVG with a warning and keeps building the rest', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await buildVite({
      name: 'malformed',
      path: './fixtures/basic/broken/*.svg',
      options: { svgo: false, oxvg: false },
    })

    // build completed instead of rejecting/aborting on the malformed file
    expect('output' in result).toBe(true)
    if (!('output' in result))
      return

    // warning names the skipped file
    const warned = spy.mock.calls.some(call =>
      call.some(arg =>
        typeof arg === 'string'
        && arg.includes('could not be parsed and was skipped')
        && arg.includes('broken'),
      ),
    )
    expect(warned).toBe(true)

    // the valid icon is still emitted, the malformed one is dropped
    const asset = result.output.find(
      asset =>
        asset.name?.startsWith('spritemap.') && asset.name.endsWith('.svg'),
    )
    expect(asset).toBeDefined()
    if (asset && 'source' in asset) {
      expect(asset.source).toContain('valid')
      expect(asset.source).not.toContain('broken')
    }

    spy.mockRestore()
  })
})
