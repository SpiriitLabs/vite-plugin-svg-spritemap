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

You can see the usage in the [corresponding demo folder](https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/tree/main/demo/vue/src/App.vue).

## TypeScript

For TypeScript, you need to load the type definitions inside `vite-env.d.ts` to fix errors with `?use`/`?view` query.

```ts
/// <reference types="vite/client" />
/// <reference types="@spiriit/vite-plugin-svg-spritemap/client" />
```

### Type-safe icon props

You can use the [types option](/options/types) to generate TypeScript types for all your icons, allowing you to type your icon props for better type safety.

```ts
// vite.config.ts
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default {
  plugins: [
    VitePluginSvgSpritemap('./assets/icons/*.svg', {
      types: 'src/types/spritemap.d.ts',
    }),
  ],
}
```

Then use the generated types in your Vue components. For example, with a reusable Icon component:

```vue
<script lang="ts" setup>
import type { Icons } from './types/spritemap'

const props = defineProps<{
  name?: Icons
}>()

const Icon = computed(() => {
  return props.name
    ? defineAsyncComponent(() => import(`assets/icons/${props.name}.svg?use`))
    : null
})
</script>

<template>
  <component :is="Icon" v-if="name" :class="`icon icon-${name}`">
    <slot />
  </component>
</template>
```

Now the `name` prop is type-safe and will only accept valid icon names from your spritemap. TypeScript will provide autocomplete and catch invalid icon names at compile time.

## Nuxt 3/4

> [!NOTE]
> This plugin only works with Nuxt 3/4 and Vite as a bundler.

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

You can see the usage in the [corresponding demo folder](https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/tree/main/demo/nuxt/app.vue).

### HMR support

The injection of the HMR script is not supported on Nuxt. You should add it manually by adding `<script type="module" src="/_nuxt/@vite-plugin-svg-spritemap/client"></script>` on development only.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  $development: {
    app: {
      head: {
        script: [
          { src: '/_nuxt/@vite-plugin-svg-spritemap/client', type: 'module' },
        ],
      },
    },
  },
})
```

### Improve Nuxt performance

You can improve performance by removing one instance of the plugin by using enable the [`viteEnvironmentApi`](https://nuxt.com/docs/4.x/guide/going-further/experimental-features#viteenvironmentapi) option. This Nuxt option is available since Nuxt 4.2 and will be activated by default in Nuxt 5.

This will also [remove the log pollution](https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/83) in the console.

>[!IMPORTANT]
> On some setup this option can cause issues with plugins. Test your project with this option to ensure it works as expected.

## TypeScript

For usage with TypeScript, you will need to add in a `.d.ts` file the reference type to use the `?use`/`?view` query.

```ts
/// <reference types="@spiriit/vite-plugin-svg-spritemap/client" />
```
