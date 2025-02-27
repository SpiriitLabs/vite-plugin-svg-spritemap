# Styles variables

::: warning
This is only working on preprocessing languages like Sass, Less or Stylus
:::

Like [svg-spritemap-webpack-plugin](https://github.com/cascornelissen/svg-spritemap-webpack-plugin/blob/master/docs/variables.md), this plugin implement, since the version 4.1, a copy of this feature.

> One of the benefits of SVGs is the ability to style them through CSS. [...] This is where the styles option may come into play as it allows developers to use any sprite as a background-image in their Sass/Less/CSS.

>A downside to using the sprite as a background-image is that you lose the ability to style it and that's what this improvement aims to fix. It will never work as well as using inline SVGs and it adds to the filesize of your CSS bundle but it does allow for changing some basic variables in the inlined sprites.

## Usage

If you want to access to an attribute in your svg sprite via styles, you will need to transform a property inside your svg first. For example if you have a `fill` with a white color, it will become:

```html
<path var:color.fill="#fff" />
```

will be process and output in your spritemap as

```html
<path fill="#fff" />
```

::: info
This feature introduces a `var` XML namespace. Although namespaces are not mandatory for the sprites to function, you might encounter warnings from browsers or IDEs about invalid attributes. An XML namespace is identified by a unique name (URI, not a URL). You can add an attribute like this to the root SVG element of the sprite:

```html
<svg xmlns:var="https://spiriit.com">
```
:::

### With SCSS

### With Less

### With Stylus


## Short notation

You can also use the short notation. This approach can enhance readability when using a small number of variables in a single sprite. However, it may cause issues when attempting to use multiple variables for the same attribute.

For example for the `fill` attribute:

```html
<path var:fill="#fff" />
```

is equivalent to

```html
<path var:fill.fill="#fff" />
```

