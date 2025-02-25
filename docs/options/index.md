# Options

The first argument is a glob path (using [fast-glob](https://github.com/mrmlnc/fast-glob)) and the second is an object with the following options:

## output

See [Output options](/options/output)

## styles

See [Styles options](/options/styles)

## prefix

- **Type:** `string | false`
- **Default:** `'sprite-'`

Define the prefix uses for sprite id in `<symbol>`/`<use>`/`<view>`.
Set to false to disable the prefix.

## svgo

- **Type:** `boolean | object`
- **Default:** `false` if SVGO not installed, `true` if SVGO is installed

Take an SVGO Options object.
If `true`, it will use the [default SVGO preset](https://github.com/svg/svgo#default-preset), if `false`, it will disable SVGO optimization.

## injectSvgOnDev

- **Type:** `boolean`
- **Default:** `false`

Inject the SVG Spritemap inside the body on dev (see [Backend integration](/guide/backend-integration)).

## idify

- **Type:** `(name: string, svg: object) => string`
- **Default:** `name => options.prefix + name`

Function allowing to customize the id of each symbol of the spritemap svg.

## route

- **Type:** `string`
- **Default:** `'__spritemap'`

Change the route name allowing you to have multiple instance of the plugin (see [Multiple Instance](/guide/multiple-instance)).

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
