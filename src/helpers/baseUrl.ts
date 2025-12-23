export function getBaseUrl(url: string, base: string): string {
  if (!base || base === '/')
    return url
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`
  return `${normalizedBase}${normalizedUrl}`
}
