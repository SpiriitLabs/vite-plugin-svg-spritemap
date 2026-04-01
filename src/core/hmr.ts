import type { Options } from '@/types'

export function generateHMR(event: string, spritemap: string | undefined, options: Options) {
  const injectSvg = `
  const injectSvg = (data) => {
    const oldWrapper = document.getElementById('vite-plugin-svg-spritemap')
    if (oldWrapper)
      oldWrapper.remove()

    const wrapper = document.createElement('div')
    wrapper.innerHTML = data.spritemap
    wrapper.id = 'vite-plugin-svg-spritemap'
    wrapper.style.display = 'none'
    document.body.append(wrapper)
  }`

  const updateElements = `
  const elements = document.querySelectorAll(
    '[src*="' + data.route.url + '"], [href*="' + data.route.url + '"], [*|href*="' + data.route.url + '"]'
  )

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i]
    const attributes = ['href', 'src', 'xlink:href']
    for (const attr of attributes) {
      if (!el.hasAttribute(attr)) continue
      const value = el.getAttribute(attr)
      if (!value) continue
      const routeIdx = value.indexOf(data.route.url)
      if (routeIdx === -1) continue
      const prefix = value.substring(0, routeIdx)
      const hashIdx = value.indexOf('#', routeIdx)
      if (hashIdx === -1) continue
      const hash = value.substring(hashIdx + 1)
      el.setAttribute(attr, prefix + data.route.url + '__' + data.id + '#' + hash)
    }
  }`

  return `console.debug('[vite-plugin-svg-spritemap]', 'connected.')
    ${options.injectSvgOnDev ? injectSvg : ''}
    ${options.injectSvgOnDev ? `injectSvg(${JSON.stringify({ spritemap })})` : ''}
    if (import.meta.hot) {
      import.meta.hot.on('${event}', data => {
        console.debug('[vite-plugin-svg-spritemap]', 'update for route ' + data.route.name)
        ${updateElements}
        ${options.injectSvgOnDev ? 'injectSvg(data)' : ''}
      })
    }`
}
