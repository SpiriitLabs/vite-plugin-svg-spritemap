import { resolve } from 'path'
import { normalizePath } from 'vite'

export const getPath = (...pathSegments: string[]) => {
  return normalizePath(resolve(__dirname, './../', ...pathSegments))
}
