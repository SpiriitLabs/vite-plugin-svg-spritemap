import type { SvgMapObject } from '@/types'
import { normalizePath } from 'vite'

export interface IconEntry {
  id: string
  /** Icon file path, normalized to forward slashes so picomatch can match it. */
  posixPath: string
}

/**
 * Every icon, sorted by id. One definition so the generated types and the
 * `virtual:spritemap` module list icons in the same order.
 * @param svgs - The manager's collection, keyed by file path
 */
export function sortedIcons(svgs: Map<string, SvgMapObject>): IconEntry[] {
  return Array.from(svgs.values())
    .map(({ id, filePath }) => ({ id, posixPath: normalizePath(filePath) }))
    // Locale-independent sort so the output is deterministic across environments.
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
