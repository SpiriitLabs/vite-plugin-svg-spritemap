# Vue components

`vite-plugin-svg-spritemap` allows you to load icons and create `<use>` as `<svg>` and `<view>` as `<img>` tags like Vue components.

To do that, import the icons loaded by `vite-svg-spritemap` and add the `?use` or `?view` query. The plugin will transform the component.

```vue
<script setup lang="ts">
import SpiriitUse from './icons/spiriit.svg?use'
import SpiriitView from './icons/spiriit.svg?view'
import ViteUse from './icons/vite.svg?use'
import ViteView from './icons/vite.svg?view'
</script>

<template>
  <SpiriitUse>
    <!-- You can use the slot to pass a title before the use tag generation -->
    <title>My superb logo</title>
  </SpiriitUse>
  <ViteUse />

  <SpiriitView />
  <ViteView />
</template>
```

will generate

```html
<svg>
  <title>My superb logo</title>
  <use xlink:href="/__spritemap#sprite-spiriit"></use>
</svg>
<svg>
  <use xlink:href="/__spritemap#sprite-vite"></use>
</svg>
<img src="/__spritemap#sprite-spiriit-view" width="118" height="38">
<img src="/__spritemap#sprite-vite-view" width="31" height="32">
```

You can see the usage in the [corresponding demo folder](/demo/vue/src/App.vue).

## Typescript

For typescript, you need to load the type definitions inside `vite-env.d.ts` to fix errors with `?use`/`?view` query.

```ts
/// <reference types="vite/client" />
/// <reference types="@spiriit/vite-plugin-svg-spritemap/client" />
```

## Nuxt 3

> [!NOTE]
> This plugin only works with Nuxt 3 and Vite as a bundler.

You just need to install the plugin and set it in the right place for Nuxt 3.

```ts
// nuxt.config.ts
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default defineNuxtConfig({
  vite: {
    plugins: [
      VitePluginSvgSpritemap('./assets/icons/*.svg'),
    ]
  }
})
```

You can see the usage in the [corresponding demo folder](/demo/nuxt/app.vue).

## Typescript

For usage with TypeScript, you will need to add in a `.d.ts` file the reference type `/// <reference types="@spiriit/vite-plugin-svg-spritemap/dist/client" />` (see [issue #38](https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/38)) to use `?use`/`?view` query.

```ts
/// <reference types="@spiriit/vite-plugin-svg-spritemap/dist/client" />
```
