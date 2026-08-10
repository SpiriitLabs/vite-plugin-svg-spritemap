import { describe, expect, it } from 'vitest'
import { toUserUnits } from '../src/helpers/length'

describe('toUserUnits', () => {
  it.each([
    ['24', 24],
    ['24px', 24],
    ['24PX', 24],
    ['  24  ', 24],
    ['.5', 0.5],
    ['31.88', 31.88],
    ['+8', 8],
    ['1e2', 100],
    // absolute units keep the number they have always been read as
    ['24pt', 24],
    ['10mm', 10],
  ])('reads %s as %s user units', (value, expected) => {
    expect(toUserUnits(value)).toBe(expected)
  })

  it.each([
    // relative to a viewport, font size or parent box
    ['100%'],
    ['1.5em'],
    ['2rem'],
    ['3ex'],
    ['4ch'],
    ['50vw'],
    ['10VH'],
    ['5vmin'],
    ['5vmax'],
    // not a usable length
    ['-5'],
    ['0'],
    ['abc'],
    ['1.2.3'],
    [''],
    // overflows to Infinity
    ['1e999'],
    [null],
    [undefined],
  ])('reads %s as no length', (value) => {
    expect(toUserUnits(value)).toBeUndefined()
  })
})
