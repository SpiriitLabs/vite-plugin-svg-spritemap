/**
 * Id of the virtual module exporting the spritemap url. Not the route itself: in
 * dev the middleware answers that path with the svg, not a module
 */
export function createRouteModuleId(routeUrl: string): string {
  return `/@vite-plugin-svg-spritemap/url${routeUrl}`
}

/** A compiler concatenates the fragment onto the import, so it exports a string */
export function createRouteModule(url: string): string {
  return `export default ${JSON.stringify(url)}`
}
