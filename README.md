[![npm](https://img.shields.io/npm/v/@spiriit/vite-plugin-svg-spritemap)](https://www.npmjs.com/package/@spiriit/vite-plugin-svg-spritemap) [![node-current](https://img.shields.io/node/v/@spiriit/vite-plugin-svg-spritemap)](https://nodejs.org/) [![Coverage Status](https://coveralls.io/repos/github/SpiriitLabs/vite-plugin-svg-spritemap/badge.svg?branch=main)](https://coveralls.io/github/SpiriitLabs/vite-plugin-svg-spritemap?branch=main)

# [vite-plugin-svg-spritemap](https://spiriitlabs.github.io/vite-plugin-svg-spritemap)

> This plugin supports Vite 6 and 7.

This ViteJS plugin generates a single SVG [spritemap](https://css-tricks.com/svg-sprites-use-better-icon-fonts/) with `<symbol>`/`<view>`/`<use>` for each SVG file. It can also generate a stylesheet (CSS/SCSS/Stylus/Less) containing the sprites to be used directly (via a Data URI or SVG fragments).

> [!NOTE]
> This plugin is inspired by [svg-spritemap-webpack-plugin](https://github.com/cascornelissen/svg-spritemap-webpack-plugin) for Webpack.

## 🚀 Features

- ⚡ Fully integrated in your ViteJS environment
- 📦 Pack your SVG files in one ([spritemap](https://css-tricks.com/svg-sprites-use-better-icon-fonts/)) file
- ✨ Use your SVG in `<svg>` or `<img>` tags and also directly in your CSS/SCSS/Stylus/Less
- 🍕 Import SVG fragments as VueJS components
- 🔥 HMR support
- ⚙️ Optimize your SVGs with SVGO or OXVG

## 📦 Install

```shell
npm i -D @spiriit/vite-plugin-svg-spritemap

# yarn
yarn add -D @spiriit/vite-plugin-svg-spritemap

# pnpm
pnpm add -D @spiriit/vite-plugin-svg-spritemap

# bun
bun add -D @spiriit/vite-plugin-svg-spritemap
```

## 👨‍💻 Quick start

Add all your SVGs icons in one folder (like below `/src/icons` folder for example) and pass the first argument as a glob path including your svg files.

```ts
// vite.config.js / vite.config.ts
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default {
  plugins: [VitePluginSvgSpritemap('./src/icons/*.svg')]
}
```

You can access the spritemap via the route `/__spritemap`. All files processed by ViteJS will transform the path of the file on build. The prefix is `sprite-` by default.

The plugin will generate a spritemap to support all methods described below (files populated with `<view>` for fragments and `<use>` for sprite). This can be configured through options.

**SVG**

```html
<svg>
  <use xlink:href="/__spritemap#sprite-spiriit"></use>
</svg>
```

**Img**

You need to add the suffix `-view` to access the fragment.

```html
<img src="/__spritemap#sprite-spiriit-view" />
```

## 📚 Documentation

For more information, check the [vite-plugin-svg-spritemap documentation](https://spiriitlabs.github.io/vite-plugin-svg-spritemap). It covers everything from getting started to advanced topics.

## 🏃 What's next

- Add variable supports inspired by [svg-spritemap-webpack-plugin](https://github.com/cascornelissen/svg-spritemap-webpack-plugin/blob/master/docs/variables.md)

## 👨‍💼 License

MIT
