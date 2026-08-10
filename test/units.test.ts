import type { ResolvedConfig } from 'vite'
import { promises as fsp } from 'node:fs'
import { createLogger } from 'vite'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { SVGManager } from '../src/core/svgManager'
import { createOptions } from '../src/helpers/options'
import { getPath } from './helpers/path'

const root = getPath('./fixtures/units')

let seeded = 0
async function seed(icons: Record<string, string>): Promise<string> {
  const dir = `${root}/svg-${seeded++}`
  await fsp.mkdir(dir, { recursive: true })
  for (const [name, attributes] of Object.entries(icons)) {
    await fsp.writeFile(
      `${dir}/${name}.svg`,
      `<svg xmlns="http://www.w3.org/2000/svg" ${attributes}><path d="M0 0h1v1H0z"/></svg>`,
      'utf8',
    )
  }
  return dir
}

function createManager(dir: string) {
  // Only `root` and `logger` are ever read
  const config = {
    root,
    logger: createLogger('silent'),
  } as unknown as ResolvedConfig

  const { options } = createOptions({ svgo: false, oxvg: false })

  return {
    manager: new SVGManager(`${dir}/*.svg`, options, config, '/__spritemap'),
    logger: config.logger,
  }
}

afterAll(async () => {
  await fsp.rm(root, { recursive: true, force: true })
})

describe('relative width/height units', () => {
  it('keeps the viewBox instead of the relative size', async () => {
    const dir = await seed({ icon: 'viewBox="0 0 24 24" width="100%" height="100%"' })
    const { manager } = createManager(dir)

    await manager.updateAll()

    const svg = manager.svgs.get(`${dir}/icon.svg`)
    expect(svg?.width).toBe(24)
    expect(svg?.height).toBe(24)
    expect(manager.spritemap).toContain('<use xlink:href="#sprite-icon" width="24" height="24"')
  })

  it('skips an icon left with no usable dimensions', async () => {
    const dir = await seed({ percent: 'width="100%" height="100%"' })
    const { manager, logger } = createManager(dir)
    const spy = vi.spyOn(logger, 'warn')

    await manager.updateAll()

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('percent.svg'))
    expect(manager.svgs.size).toBe(0)
  })

  it('skips a negative size rather than emitting it', async () => {
    const dir = await seed({ negative: 'width="-5" height="-5"' })
    const { manager } = createManager(dir)

    await manager.updateAll()
    expect(manager.svgs.size).toBe(0)
  })

  it('leaves absolute units as they were', async () => {
    const dir = await seed({ points: 'width="24pt" height="24pt"' })
    const { manager } = createManager(dir)

    await manager.updateAll()
    expect(manager.svgs.get(`${dir}/points.svg`)?.width).toBe(24)
  })
})
