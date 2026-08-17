# Getting started

This ViteJS plugin generates a single SVG [spritemap](https://css-tricks.com/svg-sprites-use-better-icon-fonts/) with `<symbol>`/`<view>`/`<use>` for each SVG files. It can also generate a stylesheet (CSS/SCSS/Stylus/Less) containing the sprites to be used directly (via a Data URI or SVG fragments).

## Features
- ⚡ Fully integrated in your ViteJS environment
- 📦 Pack your SVG files in one ([spritemap](https://css-tricks.com/svg-sprites-use-better-icon-fonts/)) file
- ✨ Use your SVG in an `<svg>` or `<img>` tags and also directly in your CSS/SCSS/Stylus/Less
- 🍕 Import SVG fragment as VueJS component
- 🎨 Theme an icon per usage with [variables](/guide/variables)
- 🛡️ Generate [TypeScript types](/options/#types) for your icon names
- 🔥 HMR support
- ⚙️ Optimize your SVGs with [SVGO](/options/#svgo) or [OXVG](/options/#oxvg)

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

## Styles inside an icon

An icon may carry its own `<style>` element, which is the only way to express a state or a media query (`.alert-shape:hover { fill: #f00 }`). It is preserved into the spritemap, and that is worth knowing before you rely on one.

::: warning A `<style>` element is not scoped to its icon
The spritemap is a single SVG document and a `<style>` element styles the whole of it, wherever it sits, `<symbol>` included. A rule from one icon therefore applies to **every** sprite whose elements match its selector, and editors export class names that collide by default (Illustrator's `.cls-1`, Figma's `.st0`). Name the class after the icon (`.alert-shape`) rather than relying on the `<symbol>` to contain it.

The generated stylesheet is unaffected, since it inlines each icon into its own data URI, an independent document. Inlining the *spritemap* into the page is the other direction: reached through a URL, as a `<use>` normally does, the rules stay inside the spritemap document, but once that `<svg>` sits in your HTML its `<style>` elements are stylesheets of your page and restyle anything they match. [`injectSvgOnDev`](/options/#injectsvgondev) does exactly that, so a rule can behave one way in dev and another in the build. One more reason to name the class after the icon.
:::

To make the values in such a rule overridable per call site, see the [variables guide](/guide/variables#where-a-var-can-go).

## Advanced usage

This plugin is trying to cover a maximum of use cases and usage because ViteJS is a very versatile tool.
You can pass, as a second argument, an object with options allowing you to control the svg output.

Check the advanced and [options](/options/) documentations.

- [Backend integration](/guide/backend-integration)
- [Vue/Nuxt](/guide/vue)
- [Customize Styles Output](/guide/customize-styles-output)
- [Multiple Instance](/guide/multiple-instance)
