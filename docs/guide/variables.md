# Variables

Once an icon is baked into a `background-image` data URI, its colors and stroke widths are frozen at
whatever the source file shipped: the same icon in three colors means three `.svg` files.

Variables fix that. Mark any attribute value as themable with a standard CSS `var()`: the
SCSS/Stylus/Less mixin lets each call site override it at compile time, and a `<use>` element can be
themed at runtime by the browser with no extra work.

## Declaring a variable

Use `var(--name, default)` in a presentation attribute. This is valid SVG and valid CSS, so editors and
optimizers leave it alone, and the icon still renders on its own with the default applied.

```xml
<!-- src/icons/alert.svg -->
<svg viewBox="0 0 24 24">
  <g fill="var(--color, #fff)">
    <path d="…"/>
    <path stroke="var(--color, #fff)" stroke-width="var(--weight, 2)" d="…"/>
  </g>
</svg>
```

The name is the custom property without its `--` prefix, so the two variables above are `color` and
`weight`.

## Overriding from the mixin

The mixin takes a `$variables` map (a list of pairs in Less). Every variable the icon declares and you do
not override keeps its default.

::: code-group
```scss [SCSS]
@use './spritemap' as sprite;

.alert         { @include sprite.sprite('alert'); }
.alert--danger { @include sprite.sprite('alert', $variables: ('color': #f00)); }
.alert--bold   { @include sprite.sprite('alert', $variables: ('color': #f00, 'weight': 3)); }
```

```styl [Stylus]
@import './spritemap'

.alert
	sprite('alert')
.alert--danger
	sprite('alert', $variables: { 'color': #f00 })
.alert--bold
	sprite('alert', $variables: { 'color': #f00, 'weight': 3 })
```

```less [Less]
@import './spritemap';

.alert         { .sprite('alert'); }
.alert--danger { .sprite('alert', @variables: 'color' '#f00'); }
.alert--bold   { .sprite('alert'; @variables: 'color' '#f00', 'weight' 3); }
```
:::

::: warning Less takes a list of pairs, separated by `;`
Less has no map literal, so variables are passed as a comma-separated list of `'name' value` pairs.
Less also parses a comma inside a mixin call as an **argument** separator, so as soon as you pass more
than one pair you must separate the mixin arguments with `;` — `.sprite('alert'; @variables: 'color' '#f00', 'weight' 3)`.
A single pair works with either separator. Quote your keys, and quote any value containing a space
(`'dash' '2 4'`), since an unquoted one would be read as several list items.
:::

`$variables` is the last argument, so it composes with the others:

```scss
.alert--mask {
  @include sprite.sprite('alert', $include-size: true, $mode: 'mask', $variables: ('color': #f00));
}
```

Substitution happens **at compile time**: each call site gets its own copy of the icon with the values
already inlined. Nothing is resolved in the browser, so this works everywhere, but every themed call
site adds one more copy of the icon to your CSS bundle.

## Runtime theming with real CSS custom properties

A `var()` is left as-is in the generated spritemap, so it stays a genuine CSS custom property. Set it on
a `<use>` element, or anywhere above it, and the browser resolves it: custom properties are inherited,
and inherited properties cascade into the shadow tree a `<use>` creates. This works with the ordinary
external reference — nothing has to be inlined.

```css
.icon--danger { --color: #f00; --accent: #fa0; }
```

```html
<svg class="icon icon--danger"><use href="/__spritemap#sprite-alert"></use></svg>
```

| How the icon is used | Theming |
| --- | --- |
| `<use>`, external or inlined | runtime, via CSS custom properties |
| `?use` component | runtime, it is a `<use>` like any other |
| Generated stylesheet (`background` / `mask`) | compile time, via `$variables` / `@variables` |
| `<img src="…#sprite-alert-view">`, and `?view` | none, the default is used |
| `background-image: url('…#sprite-alert-view')`, and `$type: 'fragment'` | none, the default is used |

An `<img>`, a CSS `background-image` and a data URI are each rendered as an independent document that
the page's cascade never reaches, so a `var()` there can only fall back to its default. That is why the
plugin bakes the defaults into the data URI it writes into your stylesheet, and why the mixin substitutes
at compile time instead.

So the two mechanisms cover each other: `<use>` gets runtime theming for free, and the stylesheet path
gets compile-time substitution.

## Language support

| Language | Support |
| --- | --- |
| `scss` | full |
| `styl` | full |
| `less` | full, but a list of pairs instead of a map, and no warnings |
| `css` | defaults only, there is no mixin to pass values to |

All three preprocessors produce a byte-identical document once the data URI is decoded. Less is the one
that cannot warn you about mistakes: it has no `@warn`, so an unknown variable name is silently a no-op
and passing variables alongside `@type: 'fragment'` is silently ignored.

## Rules and edge cases

- **A default may be omitted.** `var(--color)` and `var(--color,)` both default to an empty value, which
  makes the attribute invalid and lets the element inherit instead.
- **A default may contain commas and parentheses.** Only the first top-level comma separates the name
  from the default, so `var(--shadow, rgba(0,0,0,.5))` works.
- **Several variables can share one attribute value**, e.g. `stroke-dasharray="var(--a, 2) var(--b, 4)"`.
- **One name can be reused across attributes and elements.** Declare the same default each time; if the
  defaults disagree, the first one wins and the plugin warns.
- **Names must start with a letter** and contain only letters, digits, `-` and `_`. Anything else is left
  untouched and warned about.
- **`style` attributes and `<style>` blocks are not supported.** A `var()` there is left alone, so it
  still works for runtime theming through a `<use>`, but it is not extracted and cannot be overridden
  from the mixin. Move the value to a presentation attribute.
- **Values are escaped for you.** A `#`, `%`, quote or `&` in an override is encoded so the data URI stays
  valid, so you can pass `#f00` directly. All three preprocessors apply the same escaping.
- **`var()` and `url()` as override values are inert.** They would land inside the data URI, which cannot
  see the page's custom properties or paint servers. The SCSS and Stylus mixins warn.

## Disabling

```ts
VitePluginSvgSpritemap('./src/icons/*.svg', {
  variables: false
})
```

Nothing is parsed and no defaults map is generated. See [`variables`](/options/#variables) and
[`variables.spritemap`](/options/#variables-spritemap) for the full option reference.
