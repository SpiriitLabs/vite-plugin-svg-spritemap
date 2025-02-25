# Getting started

This ViteJS plugin generates a single SVG [spritemap](https://css-tricks.com/svg-sprites-use-better-icon-fonts/) with `<symbol>`/`<view>`/`<use>` for each SVG files. It can also generate a stylesheet (CSS/SCSS/Stylus/Less) containing the sprites to be used directly (via a Data URI or SVG fragments).

## Features
- ⚡ Fully integrated in your ViteJS environment
- 📦 Pack your SVG files in one ([spritemap](https://css-tricks.com/svg-sprites-use-better-icon-fonts/)) file
- ✨ Use your SVG in an `<svg>` or `<img>` tags and also directly in your CSS/SCSS/Stylus/Less
- 🍕 Import SVG fragment as VueJS component
- 🔥 HMR support

## Install

**Requirements**

- Vite 5 or Vite 6
- Node 18 or Node 20 and superior

::: code-group

```bash [npm]
npm i -D @spiriit/vite-plugin-svg-spritemap
npm i -D svgo #if you need svgo optimization
```

```bash [Yarn]
yarn add -D @spiriit/vite-plugin-svg-spritemap
yarn add -D svgo #if you need svgo optimization
```

```bash [pnpm]
pnpm add -D @spiriit/vite-plugin-svg-spritemap
pnpm add -D svgo #if you need svgo optimization
```

```bash [Bun]
bun add -D @spiriit/vite-plugin-svg-spritemap
bun add -D svgo #if you need svgo optimization
```

:::

## Basic Usage

By default, the plugin will generate a spritemap to support all methods described below (files populated with `<view>` for fragments and `<use>` for sprite).

```ts
// vite.config.js / vite.config.ts
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default {
  plugins: [VitePluginSvgSpritemap('./src/icons/*.svg')]
}
```

You can access to the spritemap via the route `/__spritemap`. All files process by ViteJS will transform the path of the file on build. By default, you will need to use the prefix `sprite-`.

**SVG**

```html
<svg>
  <use xlink:href="/__spritemap#sprite-spiriit"></use>
</svg>
```

**Img**

You need to add the suffix `-view` to access to the fragment.

```html
<img src="/__spritemap#sprite-spiriit-view" />
```
