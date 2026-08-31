// Each instance, resolved by the plugin in dev and in build. An id always names
// one by its `route.name`; the bare form is that id for the default name, so
// neither changes meaning as instances are added
import spritemap from 'virtual:spritemap'
import flags from 'virtual:spritemap/__flags'
// The string forms, on Vite's own spellings
import spritemapSource from 'virtual:spritemap?raw'
import spritemapUrl from 'virtual:spritemap?url'

// SCSS
import './../../_fixtures/scss/style.scss'

function useTag(href: string, className: string): string {
  return `<svg class="icon ${className}"><use xlink:href="${href}"></use></svg>`
}

// `href` applies each instance's own `prefix`, so no call site repeats it
const picked = document.querySelector('#virtual-icons')
if (picked) {
  picked.innerHTML = [
    useTag(spritemap.href('spiriit'), 'icon-spiriit'),
    useTag(spritemap.href('vite'), 'icon-vite'),
    useTag(flags.href('CH'), 'flag-CH'),
  ].join('')
}

// `icons` is unprefixed and sorted, so it composes straight with `href`
const all = document.querySelector('#virtual-all')
if (all)
  all.innerHTML = spritemap.icons.map(icon => useTag(spritemap.href(icon), `icon-${icon}`)).join('')

const strings = document.querySelector('#virtual-strings')
if (strings) {
  strings.textContent = [
    `?url  → ${spritemapUrl}`,
    `?raw  → ${spritemapSource.slice(0, 60)}…  (${spritemapSource.length} chars)`,
  ].join('\n')
}

// Stylus
// import './../../_fixtures/stylus/style.styl'

// Less
// import './../../_fixtures/less/style.less'

// CSS
// import './../../_fixtures/css/spritemap.css'
// import './../../_fixtures/css/style.css'
