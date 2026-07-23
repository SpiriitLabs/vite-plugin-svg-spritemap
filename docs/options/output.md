# Output options

## output
- **Type:** `boolean | object | string`
- **Default:** `true`

As a string, set the destination of the file (see [output.filename](#output)).
Set to `false` to disable output.

## output.filename

- **Type:** `string`
- **Default:** `'[name].[hash][extname]'`

The destination of the file. You can use [output filename like Rollup](https://www.rollupjs.org/guide/en/#outputassetfilenames).

::: info
Doesn't support Rollup hash number
:::

## output.name

- **Type:** `string`
- **Default:** `'spritemap.svg'`

The name of the file, appears in the manifest key. Its base name (extension stripped) also fills the `[name]` token in [output.filename](#output), so with the default filename `output: { name: 'flags.svg' }` emits `flags.[hash].svg`.

## output.use

- **Type:** `boolean`
- **Default:** `true`

Insert `use` element in the spritemap. Allowing you to invoke svg sprite with `<use>` tag:

```html
<svg>
  <use xlink:href="/__spritemap#sprite-spiriit"></use>
</svg>
```

Disable this option to remove `use` generation on spritemap.

## output.hrefAttribute

- **Type:** `'xlink:href' | 'href' | 'both'`
- **Default:** `'xlink:href'`

Which attribute(s) are used to reference the sprite on the generated `<use>` elements — both in the spritemap and in the `?use` Vue component.

[SVG 2 removed the need for the `xlink` namespace](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/xlink:href), so `xlink:href` is deprecated in favor of `href`. This option lets you choose:

| Value | Output | Use case |
| --- | --- | --- |
| `'xlink:href'` | `<use xlink:href="#sprite-id">` | Legacy (default) |
| `'href'` | `<use href="#sprite-id">` | Browsers supporting SVG 2 |
| `'both'` | `<use href="#sprite-id" xlink:href="#sprite-id">` | Modern with legacy fallback |

```ts
VitePluginSvgSpritemap('./svg/*.svg', {
  output: {
    hrefAttribute: 'both',
  },
})
```

The `xmlns:xlink` namespace is added to the root `<svg>` of the spritemap only when `xlink:href` is emitted (i.e. for `'xlink:href'` and `'both'`).

::: tip Browser support
Check the [`href` attribute browser compatibility table](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/href#svg.elements.a.href) before dropping `xlink:href`. If you need to support browsers that predate SVG 2, use `'both'` to keep the `xlink:href` fallback.
:::

## output.view

- **Type:** `boolean`
- **Default:** `true`

Insert `view` element in the spritemap. Allowing you to invoke svg sprite with `<img>` tag or `background-image` CSS property:

```html
<img src="/__spritemap#sprite-spiriit-view" />
```

```css
.icon {
  background-image: url('/__spritemap#sprite-spiriit-view');
}
```

::: tip Why the `-view` suffix?
The spritemap generates two types of elements for each SVG:
- **`<symbol>` elements** (e.g., `#sprite-icon-name`): Used with `<use>` tags inside `<svg>` elements. These cannot be used directly with `<img>` tags or `background-image` CSS.
- **`<view>` elements** (e.g., `#sprite-icon-name-view`): Used with fragment URLs in `<img>` tags and `background-image` CSS. The `-view` suffix is required because `<view>` elements define a specific viewBox that displays only the referenced icon, not the entire spritemap.

When using `background-image` or `<img>` tags, always use the `-view` suffix to reference the correct element.
:::

Disable this option to remove `view` generation on spritemap.
