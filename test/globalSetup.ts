import { mkdir, writeFile } from 'node:fs/promises'
import { getPath } from './helpers/path'

// `fixtures/basic/main.ts` imports the generated stylesheet, which is gitignored
// and only written by the tests that enable the `styles` option. Without a
// placeholder, any test file building the fixture before those ones run fails to
// resolve the import (test files run in parallel, so it is a race).
export async function setup() {
  await mkdir(getPath('./fixtures/basic/styles'), { recursive: true })
  await writeFile(getPath('./fixtures/basic/styles/spritemap.css'), '', { flag: 'a' })
}
