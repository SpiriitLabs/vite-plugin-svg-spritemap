const lengthPattern = /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)([a-z%]*)\s*$/i

/**
 * Units resolved against something the symbol has no access to: the viewport,
 * a font size, a parent box. There is no user-unit value to read from them.
 */
const relativeUnits = ['%', 'em', 'ex', 'rem', 'ch', 'vw', 'vh', 'vmin', 'vmax']

/**
 * Read an SVG `width`/`height` attribute as a length in user units.
 *
 * Absolute units keep the behaviour they have always had, their number taken
 * as-is. A relative unit, a non-positive value or anything unparsable yields
 * `undefined`, which callers treat as the attribute being absent.
 */
export function toUserUnits(value: string | null | undefined): number | undefined {
  const match = value ? lengthPattern.exec(value) : null
  if (!match || relativeUnits.includes(match[2].toLowerCase()))
    return undefined

  const length = Number.parseFloat(match[1])
  return Number.isFinite(length) && length > 0 ? length : undefined
}
