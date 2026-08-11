/**
 * Cheap prefilter for Vite hook filters: any `.svg` id carrying a query.
 * Pair it with `parseSvgQuery` for the precise check.
 */
export const filterSvgQuery: RegExp = /\.svg\?/

/**
 * Parse a `.svg?use` / `.svg?view` component id.
 *
 * Params Vite appends on its own (`&t=…` on HMR, `&lang.js`, `&import`) are
 * ignored, and the query is read by key so their order doesn't matter.
 * @param id - The module id to inspect
 * @returns The file path and the requested component, or null when the id does not request one
 */
export function parseSvgQuery(id: string): { path: string, query: 'use' | 'view' } | null {
  const [path, rawQuery] = id.split('?', 2)
  if (typeof rawQuery === 'undefined' || !path.endsWith('.svg'))
    return null

  const params = new URLSearchParams(rawQuery.replace(/#.*$/, ''))
  if (params.has('view'))
    return { path, query: 'view' }
  if (params.has('use'))
    return { path, query: 'use' }

  return null
}
