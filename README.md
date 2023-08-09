[![npm](https://img.shields.io/npm/v/@spiriit/vite-plugin-svg-spritemap)](https://www.npmjs.com/package/@spiriit/vite-plugin-svg-spritemap) [![node-current](https://img.shields.io/node/v/@spiriit/vite-plugin-svg-spritemap)](https://nodejs.org/) [![Coverage Status](https://coveralls.io/repos/github/SpiriitLabs/vite-plugin-svg-spritemap/badge.svg?branch=main)](https://coveralls.io/github/SpiriitLabs/vite-plugin-svg-spritemap?branch=main)

# vite-plugin-svg-spritemap

This ViteJS plugin generates a single SVG [spritemap](https://css-tricks.com/svg-sprites-use-better-icon-fonts/) with `<symbol>`/`<view>`/`<use>` for each SVG files. It can also generate a stylesheet (CSS/SCSS/Stylus/Less) containing the sprites to be used directly (via a Data URI or SVG fragments).

The plugin outputs can be fully configurable through [options](#🛠-options).

> This plugin is inspired by [svg-spritemap-webpack-plugin](https://github.com/cascornelissen/svg-spritemap-webpack-plugin) for Webpack.

## 🚀 Features

- ⚡ Fully integrated in your ViteJS environment
- 📦 Pack your SVG files in one ([spritemap](https://css-tricks.com/svg-sprites-use-better-icon-fonts/)) file
- ✨ Use your SVG in an `<svg>` or `<img>` tags and also directly in your CSS
- 🔥 HMR support

## 📦 Install

```shell
npm i -D @spiriit/vite-plugin-svg-spritemap

# yarn
yarn add -D @spiriit/vite-plugin-svg-spritemap

# pnpm
pnpm add -D @spiriit/vite-plugin-svg-spritemap
```

## 👨‍💻 Usage

By default, the plugin will generate a spritemap to support all methods described below (files populated with `<view>` for fragments and `<use>` for sprite).

```ts
// vite.config.js / vite.config.ts
import VitePluginSVGSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default {
  plugins: [VitePluginSVGSpritemap('./src/icons/*.svg')]
}
```

You can access to the spritemap via the route `__spritemap`. It will be process in build. By default, you will need to use the prefix `sprite-`.

**SVG**

```html
<svg>
  <use href="__spritemap#sprite-spiriit"></use>
</svg>
```

**Img**

You need to add the suffix `-view` to access to the fragment.

```html
<img src="__spritemap#sprite-spiriit-view" />
```

**CSS**

You can also use the spritemap SVGs in your CSS. The plugin supports CSS (basic classes) and also SCSS, Stylus and Less (mixins and map with SVG Data URI and sizes).

First you need to adjust the plugin options to set the output styles. For full styles options, check the [Options](#🛠-options).

```ts
// vite.config.js / vite.config.ts
import VitePluginSVGSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default {
  plugins: [
    VitePluginSVGSpritemap('./src/icons/*.svg', {
      styles: 'src/scss/spritemap.scss'
    })
  ]
}
```

```scss
// main.scss
@import './spritemap.scss';
```

After that, you needs to import the file in your current styles. Don't forget to [load the CSS](https://vitejs.dev/guide/features.html#css) via ViteJS.

If you use a CSS preprocessing language, you can use the mixin `sprite` and access to a map with all sprites infos. If not, you will only access to classes.

You can see the usage in the demo folder :

- [CSS](/demo/basic/src/css/)
- [SCSS](/demo/basic/src/scss)
- [Less](/demo/basic/src/less/)
- [Stylus](/demo/basic/src/stylus/)

### Use for backend integration

ViteJS allows to be use to [serve assets](https://vitejs.dev/guide/backend-integration.html). So, you can connect ViteJS with Wordpress, Drupal or any kind of backend.

To make `vite-plugin-svg-spritemap` works with this kind of environnment, you will need to handle the right url inside your backend if you are on dev or build.

For example, on dev:
```html
<svg>
  <use href="#sprite-spiriit"></use>
</svg>
```

and in prod:
```html
<svg>
  <use href="https://my-cool-website.com/dist/assets/spritemap.95b4c41a.svg#sprite-spiriit"></use>
</svg>
```

To prevent CORS issue with SVG, you can use the `injectSVGOnDev` option. Don't forget to add the HMR script directly above you close body.

```html
<script type="module" src="http://localhost:5173/@vite-plugin-svg-spritemap/client"></script>
```

## 🛠 Options

The first argument is a glob path (using [fast-glob](https://github.com/mrmlnc/fast-glob)) and the second is an object with the following options :

| Options | Type                            | Default   | Description                                                                                                                                                              |
| ------- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| output  | `boolean` or `object`           | `true`    | See [output](#output)                                                                                                                                                    |
| styles  | `false` or `object` or `string` | `false`   | File destination like `src/css/spritemap.css` or [styles object](#styles)                                                                                                |
| prefix  | `string`                        | `sprite-` | Define the prefix uses for sprite id in `<symbol>`/`<use>`/`<view>`                                                                                                      |
| svgo    | `boolean` or `object`           | `true`    | Take an SVGO Options object. If `true`, it will use the [default SVGO preset](https://github.com/svg/svgo#default-preset), if `false`, it will disable SVGO optimization |
| injectSVGOnDev    | `boolean`           | `false`    | Inject the SVG Spritemap inside the body on dev  |

### output

| Options  | Type      | Default                  | Description                                                                                                                     |
| -------- | --------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| filename | `string`  | `[name].[hash][extname]` | The destination of the file. You can use [output filename like Rollup](https://www.rollupjs.org/guide/en/#outputassetfilenames) |
| use      | `boolean` | true                     | Insert `use` element in the spritemap                                                                                           |
| view     | `boolean` | true                     | Insert `view` element in the spritemap                                                                                          |

### styles

| Options  | Type                                      | Description                                                    |
| -------- | ----------------------------------------- | -------------------------------------------------------------- |
| filename | string                                    | The destination of the stylesheet file like your source folder |
| lang     | `less`/`scss`/`styl`/`css` or `undefined` |                                                                |

## 🏃 What's next

- Add support for [vite serving assets](https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/5)
- Add variable supports inspired by [svg-spritemap-webpack-plugin](https://github.com/cascornelissen/svg-spritemap-webpack-plugin/blob/master/docs/variables.md)
- Add support for SVG import as Vue Component

## 👨‍💼 Licence

MIT
