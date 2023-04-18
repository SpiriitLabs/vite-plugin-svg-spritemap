import { resolve } from 'node:path'
import { normalizePath } from 'vite'

export function getPath(...pathSegments: string[]) {
  return normalizePath(resolve(__dirname, './../', ...pathSegments))
}
