# Multiple Instance

If you want to have multiple SVG sprites files, you can configure multiple instances of the plugin. To do so, you will need the options [`route`](/options/#route). Instead of the traditional `/__spritemap`, you can set for example `/__flags`.

```ts
// vite.config.js / vite.config.ts
import VitePluginSVGSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default {
  plugins: [
    VitePluginSVGSpritemap('./src/icons/*.svg'), // will be route: '__spritemap' by default
    VitePluginSVGSpritemap('./src/flags/*.svg', {
      route: '__flags'
    })
  ]
}
```

Each instance also gets its own module: `virtual:spritemap` for the first one above and `virtual:spritemap/__flags` for the second, named after [`route.name`](/options/#route). See [virtual:spritemap](/guide/virtual-spritemap#choosing-an-instance).

If you are using Sass, Less or Stylus: you can optimize the style file export by only generating one mixin on one instance with [`styles.include`](/options/styles.html#styles-include) set to `['data']` and/or use the `styles.names` object.
