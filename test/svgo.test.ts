import type { Config as SvgoConfig } from 'svgo'
import type { UserOptions } from '../src/types'
import { describe, expect, it, vi } from 'vitest'
import { logMessage } from '../src/helpers/log'
import { getOptions } from '../src/helpers/svgo'
import { buildVite } from './helpers/build'

const svgoConfigs: Record<string, UserOptions['svgo']> = {
  default: true,
  false: false,
  custom: {
    plugins: ['prefixIds'],
  },
}

describe('svgo getOptions', () => {
  it('returns undefined when false', () => {
    expect(getOptions(false, 'sprite-')).toBeUndefined()
  })

  it('returns the custom config when object', () => {
    const config: SvgoConfig = { plugins: ['prefixIds'] }
    expect(getOptions(config, 'sprite-')).toBe(config)
  })

  it('preserves the sprite prefix in the default config', () => {
    for (const value of [undefined, true] as const)
      expect(JSON.stringify(getOptions(value, 'sprite-'))).toContain('"preservePrefixes":["sprite-"]')
  })
})

describe('svgo', () => {
  for (const key in svgoConfigs) {
    if (Object.hasOwn(svgoConfigs, key)) {
      it(key, async () => {
        const svgo = svgoConfigs[key]
        const result = await buildVite({
          name: `svgo_${key}`,
          options: { svgo, oxvg: false },
        })
        if (!('output' in result))
          return
        const asset = result.output.find(
          asset =>
            asset.name?.startsWith('spritemap.') && asset.name.endsWith('.svg'),
        )

        expect(asset).toBeDefined()

        if (asset && 'source' in asset)
          expect(asset.source).toMatchSnapshot()
      })
    }
  }

  for (const key in svgoConfigs) {
    if (Object.hasOwn(svgoConfigs, key)) {
      it(`${key} with warning`, async () => {
        const spy = vi.spyOn(console, 'warn')
        vi.doMock('svgo', async () => {})

        const svgo = svgoConfigs[key]
        const result = await buildVite({
          name: `svgo_warning`,
          options: { svgo, oxvg: false },
        })
        const warningStr = logMessage('You need to install SVGO to be able to optimize your SVG with it.')

        if (svgo === false) {
          expect(spy.mock.calls).not.toContainEqual([warningStr])
        }
        else {
          expect(spy.mock.calls).toContainEqual([warningStr])
        }

        spy.mockClear()
        vi.doUnmock('svgo')

        if (!('output' in result))
          return
        const asset = result.output.find(
          asset =>
            asset.name?.startsWith('spritemap.') && asset.name.endsWith('.svg'),
        )

        expect(asset).toBeDefined()

        if (asset && 'source' in asset)
          expect(asset.source).toMatchSnapshot()
      })
    }
  }
})
