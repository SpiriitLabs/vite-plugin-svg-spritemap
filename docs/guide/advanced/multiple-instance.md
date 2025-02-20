# Multiple Instance

If you want to have multiple SVG sprites files, you can configure multiple instances of the plugin. To do so, you will need the options `route`. Instead of the traditionnal `/__spritemap`, you can set for example `/__flags`.

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

If you are using Sass, Less or Stylus: you can optimize the style file export by only generate one mixin on one instance with `styles.include` set to `['variables']` or/and use the `styles.names` object.
