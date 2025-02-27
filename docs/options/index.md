# Options

The first argument is a glob path (using [tinnyglobby](https://github.com/SuperchupuDev/tinyglobby))

```ts
// vite.config.js / vite.config.ts
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default {
  plugins: [VitePluginSvgSpritemap('./src/icons/*.svg')]
}
```

The second argument is an object with several options. **See below for more details about each options**.

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

## output

See [Output options](/options/output)

## styles

See [Styles options](/options/styles)

## prefix

- **Type:** `string | false`
- **Default:** `'sprite-'`

Define the prefix uses for sprite id in `<symbol>`/`<use>`/`<view>`.
You can set this option to false to disable the prefix.

This option is recommended to prevent conflict with other SVG or ids in your project.

## svgo

- **Type:** `boolean | object`
- **Default:** `false` if SVGO not installed, `true` if SVGO is installed

Take an SVGO Options object.
If `true`, it will use the [default SVGO preset](https://github.com/svg/svgo#default-preset), if `false`, it will disable SVGO optimization.

::: warning
Since the version 3.0, you need to install `svgo` manually as a depency of your project if you want `vite-plugin-svg-spritemap` to process SVG file with it.

::: code-group

```bash [npm]
npm i -D svgo
```

```bash [Yarn]
yarn add -D svgo
```

```bash [pnpm]
pnpm add -D svgo
```

```bash [Bun]
bun add -D svgo
```
:::

## injectSvgOnDev

- **Type:** `boolean`
- **Default:** `false`

Inject the SVG Spritemap inside the body on dev. Useful for mitigate CORS issue with a [Backend](/guide/backend-integration).

## idify

- **Type:** `(name: string, svg: object) => string`
- **Default:** `name => name`

Function allowing to customize the id of each symbol of the spritemap svg.

## route

- **Type:** `string`
- **Default:** `'__spritemap'`

Change the route name allowing you to have multiple instance of the plugin (see [Multiple Instance](/guide/multiple-instance)).
