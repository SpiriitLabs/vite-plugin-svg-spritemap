# Options

The first argument is a glob path (using [fast-glob](https://github.com/mrmlnc/fast-glob)) and the second is an object with the following options :

| Options        | Type                                | Default   | Description   |
| -------------- | ----------------------------------- | --------- | ------------- |
| output         | `boolean` or `object` or `string`   | `true`  | As a string, set the destination of the file (see [output.filename](#output)).<br> For more control, see [output](#output).<br> Set to false to disable output. |
| styles         | `false` or `object` or `string`     | `false` | File destination like `src/css/spritemap.css` or [styles object](#styles) |
| prefix         | `string` or `false`  | `sprite-`    | Define the prefix uses for sprite id in `<symbol>`/`<use>`/`<view>`.<br> Set to false to disable the prefix |
| svgo           | `boolean` or `object`     | `false` if SVGO not installed, `true` if SVGO is installed  | Take an SVGO Options object.<br> If `true`, it will use the [default SVGO preset](https://github.com/svg/svgo#default-preset), if `false`, it will disable SVGO optimization |
| injectSvgOnDev | `boolean`  | `false`   | Inject the SVG Spritemap inside the body on dev |
| idify          | `(name:string, svg:object) => string`   | `name => options.prefix + name` | Function allowing to customize the id of each symbol of the spritemap svg. |
| route          | `string`   | `__spritemap` | Change the route name allowing you to have multiple instance of the plugin |

## Example with full options

```ts
// vite.config.js / vite.config.ts
import VitePluginSVGSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default {
  plugins: [
    VitePluginSVGSpritemap('./src/icons/*.svg', {
      prefix: 'icon-',
      route: '__spritemap',
      output: {
        filename: '[name].[hash][extname]',
        name: 'spritemap.svg',
        view: false,
        use: true,
      },
      svgo: {
        plugins: [
          {
            name: 'removeStyleElement',
          },
        ],
      },
      injectSvgOnDev: true,
      idefy: (name, svg) => `icon-${name}-cheese`,
      styles: {
        lang: 'scss',
        filename: 'src/scss/spritemap.scss',
        include: ['mixin', 'variables'],
        names: {
          prefix: 'sprites-prefix',
          sprites: 'sprites',
          mixin: 'sprite',
        },
        callback: ({ content, options, createSpritemap }) => {
          return content
        }
      }
    })
  ]
}
```
