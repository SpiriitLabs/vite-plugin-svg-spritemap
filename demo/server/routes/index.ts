import { readFileSync } from 'node:fs'
import process from 'node:process'
import pug from 'pug'

export default eventHandler(() => {
  let mScript = ''
  let mStyle = ''
  let mSpritemap = ''

  if (process.env.NODE_ENV === 'production') {
    const manifestRaw = readFileSync(
      'public/.vite/manifest.json',
      { encoding: 'utf-8' },
    )
    const manifest = JSON.parse(manifestRaw)
    mScript = manifest['src/main.ts'].file
    mStyle = manifest['src/main.ts'].css[0]
    mSpritemap = manifest['spritemap.svg'].file
  }

  const html = pug.renderFile('routes/index.pug', {
    name: 'index',
    mScript,
    mStyle,
    mSpritemap,
    mode: process.env.NODE_ENV,
  })

  return html
})
