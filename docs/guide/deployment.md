# Deployment

The spritemap is emitted as a regular Vite asset, and every [`/__spritemap`](/options/#route) reference in your HTML, CSS and JavaScript is rewritten to its final URL at build time. In dev, the same route is served by the plugin's middleware. There is nothing to configure for a site served from the domain root.

## Serving from a sub-path

Set Vite's [`base`](https://vite.dev/config/shared-options.html#base) to where the site is served from, and the rewritten URL follows it.

```ts
// vite.config.js / vite.config.ts
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default {
  base: '/my-repo/',
  plugins: [VitePluginSvgSpritemap('./src/icons/*.svg')]
}
```

Keep writing the plain route in your source, the build takes care of the rest.

```html
<!-- your source -->
<svg><use xlink:href="/__spritemap#sprite-spiriit"></use></svg>

<!-- build output -->
<svg><use xlink:href="/my-repo/assets/spritemap.87d0f5c1.svg#sprite-spiriit"></use></svg>
```

The dev server serves the spritemap behind the base too, at `/my-repo/__spritemap`.

## A relative base

`base: './'` is the exception. The spritemap is a single file referenced from three kinds of output, and a relative URL is resolved against a different location in each of them:

| Referenced from | Resolved against |
| --- | --- |
| an HTML page | the page's own directory, which differs from one page to the next |
| a stylesheet | the CSS file's directory, usually `assets/` |
| a script | the current document URL, which changes with client-side routing |

No single relative path is correct in all three, so under a relative base the plugin emits a root-absolute `/assets/spritemap.<hash>.svg`. That is the right value for a site served from the domain root, and it is what makes SvelteKit work, since its client build sets `base: './'`.

::: warning A relative base does not follow a sub-path
Combining `base: './'` with a sub-directory deploy leaves the spritemap pointing at the domain root. Set the sub-path as the `base` instead, as above.
:::

## Serving the spritemap yourself

If your pages are rendered by a backend rather than processed by Vite, no rewriting happens and you have to build the URL on your side. See [Backend integration](/guide/backend-integration).
