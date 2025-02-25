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
Doesn't support rollup hash number
:::

## output.name

- **Type:** `string`
- **Default:** `'spritemap.svg'`

The name of file, appear on the manifest key.

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

## output.view

- **Type:** `boolean`
- **Default:** `true`

Insert `view` element in the spritemap. Allowing you to invoke svg sprite with `<img>` tag:

```html
<img src="/__spritemap#sprite-spiriit-view" />
```

Disable this option to remove `view` generation on spritemap.
