import { escapeRegExp } from './escapeRegExp'

interface RouteRegExpOptions {
  /**
   * Also swallow an optional leading `.` so a relative `./__spritemap`
   * reference doesn't keep a dangling dot once the base is applied — otherwise
   * the base gets doubled (`./example/…` → resolved as `/example/example/…`).
   * Disable for a relative base, where the leading dot must be preserved to
   * keep the emitted path relative.
   * @default true
   */
  dot?: boolean
  /**
   * Also match the legacy `-<number>` hashed suffix produced by older dev
   * rewrites so it gets replaced instead of duplicated.
   * @default true
   */
  numbered?: boolean
}

/**
 * Build a global RegExp matching a raw route reference (`route.url`, e.g.
 * `/__spritemap`) inside HTML/CSS/JS so it can be rewritten to the base-aware
 * url (dev) or the emitted asset path (build).
 */
export function createRouteRegExp(routeUrl: string, { dot = true, numbered = true }: RouteRegExpOptions = {}): RegExp {
  const prefix = dot ? '\\.?' : ''
  const route = escapeRegExp(routeUrl)
  const numberedAlt = numbered ? `${prefix}${route}-\\d*|` : ''
  return new RegExp(`${numberedAlt}${prefix}${route}`, 'g')
}
