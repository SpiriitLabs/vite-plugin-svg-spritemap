# Output options

## output
- **Type:** `boolean | object | string`
- **Default:** `true`

As a string, set the destination of the file (see [output.filename](#output)).
For more control, see [output](#output).
Set to `false` to disable output.

## output.filename

- **Type:** `string`
- **Default:** `'[name].[hash][extname]'`

The destination of the file. You can use [output filename like Rollup](https://www.rollupjs.org/guide/en/#outputassetfilenames).

*Note: Doesn't support hash number.*

## output.name

- **Type:** `string`
- **Default:** `'spritemap.svg'`

The name of file, appear on the manifest key.

## output.use

- **Type:** `boolean`
- **Default:** `true`

Insert `use` element in the spritemap.

## output.view

- **Type:** `boolean`
- **Default:** `true`

Insert `view` element in the spritemap.
