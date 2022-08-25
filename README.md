# vite-plugin-svg-spritemap

This ViteJS plugin generates a single SVG [spritemap](https://css-tricks.com/svg-sprites-use-better-icon-fonts/) with `<symbol>`/`<view>`/`<use>` for each SVG files. It can also generate a stylesheet (CSS/SCSS/Stylus/Less) containing the sprites to be used directly (via a Data URI or SVG fragments).

The plugin outputs can be fully configurable through options (see the [Options](#🛠-options)).

This plugin is inspired by [svg-spritemap-webpack-plugin](https://github.com/cascornelissen/svg-spritemap-webpack-plugin) for Webpack.

## 🚀 Features

- ⚡ Fully integrated in your ViteJS environment
- 📦 Pack your SVG files in one file ([spritemap](https://css-tricks.com/svg-sprites-use-better-icon-fonts/))
- ✨ Use your SVG in an `<svg>` or `<img>` tags and also directly in your CSS
- 🔥 HMR support

## 📦 Install

```shell
npm i -D vite-plugin-browser-sync

# yarn
yarn add -D vite-plugin-browser-sync

# pnpm
pnpm add -D vite-plugin-browser-sync
```

## 👨‍💻 Usage

By default, the plugin will generate a spritemap to support all methods described below (files populated with `<view>` for fragments and `<use>` for sprite.

```ts
// vite.config.js / vite.config.ts
import VitePluginSVGSpritemap from 'vite-plugin-svg-spritemap'

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
import VitePluginSVGSpritemap from 'vite-plugin-svg-spritemap'

export default {
  plugins: [
    VitePluginSVGSpritemap('./src/icons/*.svg', {
      styles: 'src/scss/spritemap.scss'
    })
  ]
}
```

After that, you needs to import the file in your current styles. Don't forget to [load the CSS](https://vitejs.dev/guide/features.html#css) via ViteJS.

```scss
// main.scss
@import './spritemap.scss';
```

If you use a CSS preprocessing language, you can use the mixin `sprite` and access to a map with all sprites infos. If not, you will only access to classes.

You can see the usage in the demo folder :

- [CSS](/tree/main/demo/src/css/)
- [SCSS](/tree/main/demo/src/scss)
- [Less](/tree/main/demo/src/less/)
- [Stylus](/tree/main/demo/src/stylus/)

## 🛠 Options

## 🏃 What's next

- Add variable supports like [svg-spritemap-webpack-plugin](https://github.com/cascornelissen/svg-spritemap-webpack-plugin/blob/master/docs/variables.md)

## 👨‍💼 Licence

GPL-3.0
