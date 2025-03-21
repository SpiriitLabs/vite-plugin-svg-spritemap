# Customize styles output

By default, the plugin will generate CSS or a mixin (for SCSS, Less and Stylus) with variables which contains all sprites data.

You can alter the output by using the [`styles.callback`](/options/styles#styles-callback). You can access the default content generated by the plugin but you can also write your own output by using the createSpritemap function.

In the example below, this will generate only background data uri.

```ts
// vite.config.js / vite.config.ts
import VitePluginSVGSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default {
  plugins: [
    VitePluginSVGSpritemap('./src/icons/*.svg', {
      styles: {
        filename: 'src/scss/spritemap.css',
        callback: ({ content, options, createSpritemap }) => {
          let insert = ''
          insert += createSpritemap((name, svg) => {
            const selector = `.${options.prefix}${name}`
            let sprite = ''
            sprite = `${selector} {`
            sprite += `\n\tbackground: url("${svg.svgDataUri}") center no-repeat;`
            sprite += '\n}'
            return sprite
          })
          return insert
        }
      }
    })
  ]
}
```

You can use the [`styles.include`](/options/styles.html#styles-include) option to control exactly what to include inside your style. If you want only variables with `['variables']` for SCSS/Less/Stylus or `['bg']` in CSS, only background css class generation for example.

You can also control the names, via the [`styles.names`](/options/styles.html#styles-names) option, of the `mixin`, the variables `sprites` and `prefix`.

```ts
// vite.config.js / vite.config.ts
import VitePluginSVGSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default {
  plugins: [
    VitePluginSVGSpritemap('./src/icons/*.svg', {
      styles: {
        filename: 'src/scss/spritemap.scss',
        names: {
          mixin: 'icon-sprite',
          prefix: 'icon-prefix',
          sprites: 'icons'
        }
      }
    })
  ]
}
```
