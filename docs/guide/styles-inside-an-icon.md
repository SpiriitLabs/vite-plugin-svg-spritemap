# Styles inside an icon

An icon may carry its own `<style>` element, which is the only way to express a state or a media query (`.alert-shape:hover { fill: #f00 }`). It is preserved into the spritemap, and that is worth knowing before you rely on one.

::: warning A `<style>` element is not scoped to its icon
The spritemap is a single SVG document and a `<style>` element styles the whole of it, wherever it sits, `<symbol>` included. A rule from one icon therefore applies to **every** sprite whose elements match its selector, and editors export class names that collide by default (Illustrator's `.cls-1`, Figma's `.st0`). Name the class after the icon (`.alert-shape`) rather than relying on the `<symbol>` to contain it.

The generated stylesheet is unaffected, since it inlines each icon into its own data URI, an independent document. Inlining the *spritemap* into the page is the other direction: reached through a URL, as a `<use>` normally does, the rules stay inside the spritemap document, but once that `<svg>` sits in your HTML its `<style>` elements are stylesheets of your page and restyle anything they match. [`injectSvgOnDev`](/options/#injectsvgondev) does exactly that, so a rule can behave one way in dev and another in the build. One more reason to name the class after the icon.
:::

To make the values in such a rule overridable per call site, see the [variables guide](/guide/variables#where-a-var-can-go).
