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

- Vite 8 or Vite 7
- Node 20 or Node 22 and above

::: code-group

```bash [npm]
npm i -D @spiriit/vite-plugin-svg-spritemap
```

```bash [Yarn]
yarn add -D @spiriit/vite-plugin-svg-spritemap
```

```bash [pnpm]
pnpm add -D @spiriit/vite-plugin-svg-spritemap
```

```bash [Bun]
bun add -D @spiriit/vite-plugin-svg-spritemap
```

:::

## Basic Usage

Add all your SVGs icons in one folder (like below `/src/icons` folder for example) and pass the first argument as a glob path including your svg files.

```ts
// vite.config.js / vite.config.ts
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default {
  plugins: [VitePluginSvgSpritemap('./src/icons/*.svg')]
}
```

You can access the spritemap via the route [`/__spritemap`](/options/#route). All files processed by ViteJS will transform the path of the file on build. By default, you will need to use the prefix [`sprite-`](/options/#prefix).

## Access sprite

By default, the plugin will generate a spritemap to support all methods described below (files populated with `<view>` for fragments and `<use>` for sprite).

### With `<svg>` tag

To access your svg sprite, you need to use the route name (by default [`__spritemap`](/options/#route)) and the [`prefix`](/options/#prefix) + the name of your svg sprite as an anchor.

```html
<svg>
  <use xlink:href="/__spritemap#sprite-spiriit"></use>
</svg>
```

Under the hood, the spritemap generates `<use>` tags. This can be disabled by using the [`output.use`](/options/output#output-use) option.

### With `<img>` tag

If you prefer, you can access your svg spritemap with an `<img>` tag.

To access the fragment, you need to use the route name (by default [`__spritemap`](/options/#route)) and the [`prefix`](/options/#prefix) + the name of your svg sprite (with the suffix `-view`) as an anchor.

```html
<img src="/__spritemap#sprite-spiriit-view" />
```

Under the hood, the spritemap generates `<view>` tags. This can be disabled by using the [`output.view`](/options/output.html#output-view) option.

### With `background-image` CSS

You can also use the spritemap with the CSS `background-image` property. **Important:** You must use the `-view` suffix when referencing icons in `background-image`:

```css
.icon {
  background-image: url('/__spritemap#sprite-spiriit-view');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}
```

::: info Using the correct suffix
When using `background-image` or `<img>` tags, always include the `-view` suffix (e.g., `#sprite-icon-name-view`). Without it, the browser will display the entire spritemap instead of just the referenced icon.

- ✅ Correct: `url('/__spritemap#sprite-icon-name-view')`
- ❌ Incorrect: `url('/__spritemap#sprite-icon-name')` (shows entire spritemap)

This is because `<symbol>` elements (without `-view`) are designed for `<use>` tags only, while `<view>` elements (with `-view`) define a specific viewBox for fragment URLs. See [`output.view`](/options/output.html#output-view) for more details.
:::

## Advanced usage

This plugin is trying to cover a maximum of use cases and usage because ViteJS is a very versatile tool.
You can pass, as a second argument, an object with options allowing you to control the svg output.

Check the advanced and [options](/options/) documentations.

- [Backend integration](/guide/backend-integration)
- [Vue/Nuxt](/guide/vue)
- [Customize Styles Output](/guide/customize-styles-output)
- [Multiple Instance](/guide/multiple-instance)
