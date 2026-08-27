# JavaScript API

Every example in [Getting started](/guide/) writes the route by hand, `/__spritemap#sprite-vite`, and lets the plugin rewrite it. That works as long as the reference lives in a file Vite processes for your app. It does not help when you need the URL as a value: an icon name coming from data, a component in another workspace package, a component library published on npm.

`virtual:spritemap` is that value.

```js
import spritemap from 'virtual:spritemap'

element.innerHTML = `<svg><use xlink:href="${spritemap.href('vite')}"></use></svg>`
```

No route hardcoded, nothing to keep in sync with the config, and the same import works in dev, in build, under a [`base`](/guide/deployment) and through server-side rendering.

## What it exports

```js
import spritemap from 'virtual:spritemap'
```

| Property | Type | Value |
| --- | --- | --- |
| `url` | `string` | The URL the plugin actually serves |
| `name` | `string` | The instance's [`route.name`](/options/#route) |
| `prefix` | `string` | The configured [`prefix`](/options/#prefix), already applied by `href` |
| `icons` | `string[]` | Icon ids, sorted and **unprefixed** |
| `href` | `(icon: string) => string` | `url#<prefix><icon>`, ready for a `<use>` reference |

`url` is not the raw route: it is what the browser can fetch right now.

- In dev, [`base`](/guide/deployment) is applied and a `__<hash>` cache-busting suffix is appended, so an edited icon is never served from cache: `/__spritemap__d016ad75`.
- In build, it is the emitted asset path, hashed and following the base: `/assets/spritemap.d016ad75.svg`.

`icons` is the same list, in the same order, as the [generated `Icons` type](/options/#types), so the two can never disagree:

```js
spritemap.icons // ['spiriit', 'vite']
spritemap.href('vite') // '/__spritemap__d016ad75#sprite-vite'
```

## The string forms

Two queries give you a plain string instead of the object, following Vite's own meanings.

```js
import spritemapSource from 'virtual:spritemap?raw'
// The URL alone
import spritemapUrl from 'virtual:spritemap?url'
// The spritemap markup, the same document `injectSvgOnDev` inlines
```

`?url` is the same module a hand-written route reference resolves to, so both spellings stay one entry in the module graph.

::: warning `?raw` inlines the sprite
Importing `?raw` in a build inlines the markup into your chunk **while the asset file is still emitted**, so the sprite ships twice. Set [`output`](/options/output) to `false` if inlining is what you want. `?raw` keeps working in that case, it is the one form that does not need an emitted file.
:::

## TypeScript

The module is typed by the client types the plugin ships. Reference them once, in `vite-env.d.ts` or any `.d.ts` of your project:

```ts
/// <reference types="@spiriit/vite-plugin-svg-spritemap/client" />
```

Combine with the [`types`](/options/#types) option to type icon names as well:

```ts
import type { Icons } from './types/spritemap'
import spritemap from 'virtual:spritemap'

function icon(name: Icons): string {
  return spritemap.href(name)
}
```

## Plain JavaScript

Building a reference at runtime, from a name you only know then:

```js
import spritemap from 'virtual:spritemap'

function renderIcon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use')
  use.setAttribute('href', spritemap.href(name))
  svg.appendChild(use)
  return svg
}

// Every icon in the sprite, no list to maintain
spritemap.icons.forEach(name => document.body.appendChild(renderIcon(name)))
```

Editing an icon patches the sprite in place, with no page reload: the URL you already hold keeps working whatever hash it carries, because the dev server answers every one of them. Adding, removing or renaming an icon changes `icons`, so the module is regenerated and the page reloads with the new list.

The same shape wraps into a component in whatever framework you use: Svelte, SvelteKit, Solid, Angular, React. Vue and Nuxt have [dedicated components](/guide/vue), which give you a `<title>` slot and per-icon imports, so prefer those there.

## Choosing an instance

An id always names **one** instance, by its [`route.name`](/options/#route):

```js
import spritemap from 'virtual:spritemap'
import flags from 'virtual:spritemap/__flags'
```

The bare `virtual:spritemap` is the id of the instance named `spritemap`, which is the default name. It is not a "whichever instance is configured" fallback: adding a second instance can never change what an import already written in your code means.

`route.name` defaults to the route URL without its leading slash, so the [multiple instance](/guide/multiple-instance) setup below answers to `virtual:spritemap` and `virtual:spritemap/__flags`:

```ts
export default {
  plugins: [
    VitePluginSvgSpritemap('./src/icons/*.svg'), // route.name: 'spritemap'
    VitePluginSvgSpritemap('./src/flags/*.svg', { route: '/__flags' }), // route.name: '__flags'
  ]
}
```

Pass the object form to choose the id yourself:

```ts
VitePluginSvgSpritemap('./src/flags/*.svg', {
  route: { url: '/__flags', name: 'flags' }, // virtual:spritemap/flags
})
```

An id naming no configured instance fails at resolution, listing the ones that exist, rather than silently returning the wrong sprite:

```
"virtual:spritemap/typo" names no configured spritemap. Available: "virtual:spritemap/spritemap", "virtual:spritemap/__flags".
```

::: tip Two instances cannot share a name
`route.name` is what an id resolves through, so the plugin warns when several instances claim the same one, and the first of them answers for all.
:::

## Monorepo

The plugin runs in the app, once. A sibling workspace package does not configure it and does not need to: `virtual:spritemap` is resolved by whichever Vite build is running, so the same import in `packages/ui` gets the app's sprite.

```
apps/site        → configures the plugin, imports @acme/ui
packages/ui      → imports 'virtual:spritemap', configures nothing
```

```ts
// apps/site/vite.config.ts
export default {
  plugins: [VitePluginSvgSpritemap('./src/icons/*.svg')]
}
```

```js
// packages/ui/src/Icon.js
import spritemap from 'virtual:spritemap'

export const icon = name => `<svg><use xlink:href="${spritemap.href(name)}"></use></svg>`
```

Two things to keep in mind:

- **The icons the sibling needs must be in the app's glob.** The glob is resolved from the Vite root and can leave the package, so point it at the sibling's icons, alongside your own if you have both.

  ```ts
  VitePluginSvgSpritemap([
    './src/icons/*.svg',
    './../../packages/ui/icons/*.svg',
  ])
  ```

- **The sibling must be part of the app's module graph**, which it is when the app imports it as source. A package built and published beforehand is the case below.

## A package published on npm

A component library can import `virtual:spritemap` and let the application it is installed into provide the sprite. This is the one recipe with real constraints, so here they are in full.

**In the library.** Import the module as usual, and mark it external in your build so it is still an import in the published file. Bundling it would try to resolve a sprite that only exists in the consumer's build.

```ts
// the library's vite.config.ts
export default {
  build: {
    lib: { entry: './src/index.js', formats: ['es'] },
    rollupOptions: { external: [/^virtual:spritemap/] },
  },
}
```

Add the plugin to `peerDependencies`, and say in your README which icon names the library expects.

**In the application.** Install and configure the plugin, and make the library's icons part of the glob. A glob may point inside `node_modules`, which is how a library ships its own icons:

```ts
export default {
  plugins: [
    VitePluginSvgSpritemap([
      './src/icons/*.svg',
      './node_modules/@acme/ui/icons/*.svg',
    ]),
  ]
}
```

Nothing else is required: the ids are excluded from dependency pre-bundling automatically, so a dependency importing them resolves the same way your own source does.

::: warning The consumer's route name has to match
A library importing the bare `virtual:spritemap` needs an instance named `spritemap`. An application that sets `route: '/__icons'` renames its instance to `__icons`, and the library's import then fails with `"virtual:spritemap" names no configured spritemap`.

Keeping the [`route`](/options/#route) URL and giving the instance the expected name settles it:

```ts
VitePluginSvgSpritemap('./src/icons/*.svg', {
  route: { url: '/__icons', name: 'spritemap' },
})
```

Documenting the name your library imports is part of shipping it.
:::

## Server-side rendering

The module resolves in the SSR environment too, so Nuxt, SvelteKit and any other SSR setup can build references while rendering on the server. In dev the URL points at the plugin's middleware, which is served by the same Vite server, and in build at the emitted asset.

## Where the demos use it

- [Basic](https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/tree/main/demo/basic) — two instances, both string forms
- [Svelte](https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/tree/main/demo/svelte) and [SvelteKit](https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/tree/main/demo/sveltekit) — the whole sprite enumerated through `icons` and `href`
- [Vue](https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/tree/main/demo/vue) and [Nuxt](https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/tree/main/demo/nuxt) — `href` next to the `?use` components
