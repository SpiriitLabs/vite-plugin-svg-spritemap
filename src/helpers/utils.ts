// From vitejs
// @see https://github.com/vitejs/vite/blob/5b4be42ad83721cbd1a6ce6f85d90c5dfd8f78cf/packages/vite/src/node/utils.ts#L1284
export function joinUrlSegments(a: string, b: string): string {
  if (!a || !b)
    return a || b || ''

  if (a[a.length - 1] === '/')
    a = a.substring(0, a.length - 1)

  if (b[0] !== '/')
    b = `/${b}`

  return a + b
}
