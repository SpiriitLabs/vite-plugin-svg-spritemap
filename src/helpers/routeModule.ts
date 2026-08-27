export const VIRTUAL_SPRITEMAP = 'virtual:spritemap'
/** `route.name` when the route option is left alone (options.ts) */
export const DEFAULT_ROUTE_NAME = 'spritemap'

/** What an id asks for: the object by default, a string behind a query */
export type SpritemapModuleKind = 'object' | 'url' | 'raw'

export interface ParsedVirtualSpritemapId {
  /** The instance named, the bare id standing for the default one */
  name: string
  kind: SpritemapModuleKind
}

/**
 * Id of one virtual module. Not the route itself: in dev the middleware answers
 * that path with the svg, not a module
 */
export function createRouteModuleId(routeUrl: string, kind: SpritemapModuleKind = 'url'): string {
  return `/@vite-plugin-svg-spritemap/${kind}${routeUrl}`
}

export type SpritemapModuleIds = Record<SpritemapModuleKind, string>

/** The three module ids an instance serves, keyed by what each one exports */
export function createSpritemapModuleIds(routeUrl: string): SpritemapModuleIds {
  return {
    object: createRouteModuleId(routeUrl, 'object'),
    url: createRouteModuleId(routeUrl, 'url'),
    raw: createRouteModuleId(routeUrl, 'raw'),
  }
}

/** Which of the three a resolved id is, or null when it is none of them */
export function spritemapModuleKind(moduleIds: SpritemapModuleIds, id: string): SpritemapModuleKind | null {
  const kinds = Object.keys(moduleIds) as SpritemapModuleKind[]
  return kinds.find(kind => moduleIds[kind] === id) ?? null
}

export interface SpritemapModuleData {
  /** Read only by `object` and `url`, so a caller with nothing emitted can defer it */
  readonly url: string
  /** Read only by `raw` */
  readonly source: string
  readonly name: string
  readonly prefix: string
  readonly icons: string[]
}

/**
 * Source of one virtual module. Both plugins share this so the three kinds cannot
 * drift apart, and `data` is read lazily per kind: `raw` never touches `url`,
 * which in build would name a file that `output: false` never emitted.
 *
 * The `url` kind exports a bare string because a template compiler concatenates
 * the fragment onto the import (#136); `object` applies the prefix in `href` so a
 * call site stops repeating it (#49).
 */
export function createSpritemapModuleSource(kind: SpritemapModuleKind, data: SpritemapModuleData): string {
  if (kind === 'raw')
    return `export default ${JSON.stringify(data.source)}`

  if (kind === 'url')
    return `export default ${JSON.stringify(data.url)}`

  return `const url = ${JSON.stringify(data.url)}
const prefix = ${JSON.stringify(data.prefix)}

export default {
  url,
  prefix,
  name: ${JSON.stringify(data.name)},
  icons: ${JSON.stringify(data.icons)},
  href: icon => \`\${url}#\${prefix}\${icon}\`,
}
`
}

/**
 * The query-less ids an instance answers: its own name, plus the bare form when
 * that name is the default. What `optimizeDeps.exclude` has to name
 */
export function virtualSpritemapIds(routeName: string): string[] {
  const ids = [`${VIRTUAL_SPRITEMAP}/${routeName}`]
  if (routeName === DEFAULT_ROUTE_NAME)
    ids.push(VIRTUAL_SPRITEMAP)

  return ids
}

/**
 * Loose gate for a hook filter, which reads a bare string as a glob and resolves
 * a relative one against the project root: an id would never match there
 */
export const virtualSpritemapFilter: RegExp = new RegExp(`^${VIRTUAL_SPRITEMAP}(?:[/?]|$)`)

/**
 * Parse `virtual:spritemap[/<route name>][?url|?raw]`.
 *
 * Params Vite appends on its own (`&t=…`, `&import`, `&lang.js`) are ignored, and
 * the query is read by key so their order doesn't matter, as `parseSvgQuery` does
 * for `?use` / `?view`.
 * @param id - The module id to inspect
 * @returns The instance named and what it asks for, or null when the id is not ours
 */
export function parseVirtualSpritemapId(id: string): ParsedVirtualSpritemapId | null {
  const [path, rawQuery] = id.split('?', 2)
  if (path !== VIRTUAL_SPRITEMAP && !path.startsWith(`${VIRTUAL_SPRITEMAP}/`))
    return null

  const name = path === VIRTUAL_SPRITEMAP
    ? DEFAULT_ROUTE_NAME
    : path.slice(VIRTUAL_SPRITEMAP.length + 1)

  // An empty name (`virtual:spritemap/`) names nothing
  if (name === '')
    return null

  const params = new URLSearchParams((rawQuery ?? '').replace(/#.*$/, ''))
  const kind: SpritemapModuleKind = params.has('raw')
    ? 'raw'
    : params.has('url') ? 'url' : 'object'

  return { name, kind }
}

/**
 * Route names of every instance in the config, published on each plugin's `api`.
 * Read from the resolved plugins rather than a module-level registry, which
 * would accumulate across runs the way `updateAll()` used to (#124)
 */
export function collectRouteNames(plugins: readonly { api?: unknown }[] | undefined, ownName: string): string[] {
  const names = (plugins ?? [])
    .flat()
    .map(plugin => (plugin?.api as { routeName?: string } | undefined)?.routeName)
    .filter((name): name is string => typeof name === 'string')

  // A config built by hand exposes no plugins; reporting this instance alone
  // beats reporting none
  return names.length > 0 ? names : [ownName]
}

/** Error text for an id naming no configured instance */
export function unknownVirtualSpritemapError(id: string, routeNames: string[]): string {
  const available = [...new Set(routeNames)].map(name => `"${VIRTUAL_SPRITEMAP}/${name}"`).join(', ')
  return `"${id}" names no configured spritemap. Available: ${available}.`
}

/**
 * Names claimed by more than one instance. An id then no longer names one
 * spritemap, and the first instance in plugin order silently answers for all of
 * them, so this is worth a warning (#135)
 */
export function duplicateRouteNames(routeNames: string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const name of routeNames) {
    if (seen.has(name))
      duplicates.add(name)
    else
      seen.add(name)
  }

  return [...duplicates]
}

/** Warning text for a name more than one instance answers to */
export function duplicateRouteNameWarning(names: string[]): string {
  const listed = names.map(name => `"${name}"`).join(', ')
  return `Several vite-plugin-svg-spritemap instances share the route name ${listed}, so "${VIRTUAL_SPRITEMAP}/<name>" cannot tell them apart and the first one answers. Give each instance its own \`route.name\`.`
}
