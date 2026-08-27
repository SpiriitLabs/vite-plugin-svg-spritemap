const escapeRegExpPattern = /[.*+?^${}()|[\]\\]/g

function escapeRegExp(text: string): string {
  return text.replace(escapeRegExpPattern, '\\$&')
}

// Pieces of a route reference. `String.raw` keeps them legible: `\.?`, not '\\.?'
const DOT = String.raw`\.?`
const LEGACY_HASH = String.raw`(?:-\d*)?`
const QUERY_OR_FRAGMENT = String.raw`(?:[#?]\S*)?`
// The cache-busting suffix the dev server appends to the route
const DEV_HASH = String.raw`(?:__[\w-]+)?`
// A reference can't continue into a path segment or identifier (#97)
const BOUNDARY = String.raw`(?![\w\-/])`

interface RouteRegExpOptions {
  /**
   * Swallow an optional leading `.`, so a relative `./__spritemap` doesn't
   * double the base. Disable for a relative base, which needs the dot kept.
   * @default true
   */
  dot?: boolean
  /**
   * Also match the legacy `-<number>` suffix, so it's replaced not duplicated.
   * @default true
   */
  numbered?: boolean
}

/**
 * Global RegExp matching a raw route reference in HTML/CSS/JS, for rewriting
 * to the base-aware url (dev) or the emitted asset path (build)
 */
export function createRouteRegExp(routeUrl: string, { dot = true, numbered = true }: RouteRegExpOptions = {}): RegExp {
  const route = (dot ? DOT : '') + escapeRegExp(routeUrl)
  return new RegExp(route + (numbered ? LEGACY_HASH : '') + BOUNDARY, 'g')
}

/**
 * Anchored RegExp matching an import specifier that is the route itself, for
 * Rollup's `external`
 */
export function createRouteImportRegExp(routeUrl: string): RegExp {
  return new RegExp(`^${DOT}${escapeRegExp(routeUrl)}${QUERY_OR_FRAGMENT}$`)
}

/**
 * Anchored RegExp matching an import specifier that is the route, or the
 * `__<hash>` form dev rewrites it to. A query or a fragment is excluded, the
 * resolved url cannot carry one
 */
export function createRouteModuleRegExp(routeUrl: string): RegExp {
  return new RegExp(`^${DOT}${escapeRegExp(routeUrl)}${DEV_HASH}$`)
}

/**
 * Loose RegExp gating which modules the route rewriting runs on. Deliberately
 * unanchored and unbounded: it only decides whether to try a rewrite
 */
export function createRouteFilterRegExp(routeUrl: string): RegExp {
  return new RegExp(escapeRegExp(routeUrl))
}
