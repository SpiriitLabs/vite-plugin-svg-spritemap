# Styles

You can also use the spritemap SVGs in your CSS. The plugin supports CSS (basic classes) and also SCSS, Stylus and Less (mixins and map with SVG Data URI and sizes).

## Using SCSS/Less/Stylus mixins

First you need to adjust the plugin options to set the output styles. For full styles options, check the [Options](/options/).

::: code-group
```ts [vite.config.ts]
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'

export default {
  plugins: [
    VitePluginSvgSpritemap('./src/icons/*.svg', {
      styles: 'src/scss/spritemap.scss'
    })
  ]
}
```

```scss [main.scss]
@import './spritemap.scss';

.example {
  @each $name, $sprite in $sprites {
    &--frags .icon-#{$name} {
      @include sprite($name, $type: 'fragment');
    }

    &--uri .icon-#{$name} {
      @include sprite($name);
    }

    &--mask-uri .icon-#{$name}-mask {
      @include sprite($name, $mode: 'mask');
    }
  }
}
```
:::

After that, you need to import the file in your current styles. Don't forget to [load the CSS](https://vitejs.dev/guide/features.html#css) via ViteJS.

If you use a CSS preprocessing language (Less/SCSS/Sass/Stylus), you can use the mixin `sprite` and access a map with all sprites info.
If you use regular CSS, you will only access to generated classes.

You can see the usage with the [examples](/examples).

To make an icon's colors or stroke widths overridable per call site, check the [variables](/guide/variables) guide.

For advanced usage like customize styles output, check this [page](/guide/customize-styles-output.md)

## Using background-image directly

If you want to use the spritemap with `background-image` CSS property without generating style files, you can reference the spritemap directly using fragment URLs. With this method, you cannot access a sprite as a data URI. Only as a fragment URL.

```css
.icon {
  background-image: url('/__spritemap#sprite-icon-name-view');
  background-size: contain;
  background-repeat: no-repeat;
}
```

::: tip Remember the `-view` suffix
When using `background-image` with fragment URLs, always include the `-view` suffix. Without it, the browser will display the entire spritemap instead of just the referenced icon. See [`output.view`](/options/output.html#output-view) for more details.
:::
