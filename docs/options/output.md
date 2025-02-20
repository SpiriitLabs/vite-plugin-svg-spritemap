# Output options

| Options  | Type      | Default                  | Description                                                                                                                                                         |
| -------- | --------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| filename | `string`  | `[name].[hash][extname]` | The destination of the file. You can use [output filename like Rollup](https://www.rollupjs.org/guide/en/#outputassetfilenames).<br> *Note: Doesn't support hash number.* |
| name     | `string`  | `spritemap.svg`          | The name of file, appear on the manifest key                                                                                                                        |
| use      | `boolean` | true                     | Insert `use` element in the spritemap                                                                                                                               |
| view     | `boolean` | true                     | Insert `view` element in the spritemap                                                                                                                              |
