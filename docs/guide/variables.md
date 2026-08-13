# Variables

Once an icon is baked into a `background-image` data URI, its colors and stroke widths are frozen at whatever the source file shipped: the same icon in three colors means three `.svg` files.

Variables fix that. Mark any attribute value as themable with a standard CSS `var()`: the SCSS/Stylus/Less mixin lets each call site override it at compile time, and a `<use>` element can be themed at runtime by the browser with no extra work.

## Declaring a variable

Use `var(--name, default)` in a presentation attribute. This is valid SVG and valid CSS, so editors and optimizers leave it alone, and the icon still renders on its own with the default applied.

```xml
<!-- src/icons/alert.svg -->
<svg viewBox="0 0 24 24">
  <g fill="var(--color, #fff)">
    <path d="…"/>
    <path stroke="var(--color, #fff)" stroke-width="var(--weight, 2)" d="…"/>
  </g>
</svg>
```

The name is the custom property without its `--` prefix, so the two variables above are `color` and `weight`.

A `style` attribute works the same way, which is how you theme a property that has no usable presentation attribute. A `<style>` element works too, and is the only way to theme a state or a media query:

```xml
<svg viewBox="0 0 24 24">
  <style>.shape:hover { fill: var(--hover, #f00) }</style>
  <path class="shape" d="…" style="mix-blend-mode:var(--blend, normal)"/>
</svg>
```

A `<style>` element is scanned as one stretch of text: its rules are never parsed, so which elements a rule applies to stays up to the browser. A `var()` written inside a selector rather than a declaration is substituted just the same, since nothing tells the two apart.

::: warning A `<style>` element is not scoped to its icon
The spritemap is a single SVG document and a `<style>` element styles the whole of it, wherever it sits, `<symbol>` included. A rule from one icon therefore applies to **every** sprite whose elements match its selector, and editors export class names that collide by default (Illustrator's `.cls-1`, Figma's `.st0`). Name the class after the icon (`.alert-shape`) rather than relying on the `<symbol>` to contain it.

This only affects the spritemap: the generated stylesheet inlines each icon into its own data URI, which is an independent document.
:::

## Overriding from the mixin

The mixin takes a `$variables` map (a list of pairs in Less). Every variable the icon declares and you do not override keeps its default.

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
Less has no map literal, so variables are passed as a comma-separated list of `'name' value` pairs. Less also parses a comma inside a mixin call as an **argument** separator, so as soon as you pass more than one pair you must separate the mixin arguments with `;` — `.sprite('alert'; @variables: 'color' '#f00', 'weight' 3)`. A single pair works with either separator. Quote your keys. A value containing a space works either way, quoted (`'dash' '2 4'`) or not (`'dash' 2 4`): everything past the name is folded back into one value.

**A value containing a comma must be quoted.** An unquoted one starts the next pair, and since Less has no `@warn` everything past the comma is dropped in silence: `'font' Arial, sans-serif` substitutes `Arial` alone. Write `'font' 'Arial, sans-serif'`.
:::

`$variables` is the last argument, so it composes with the others:

```scss
.alert--mask {
  @include sprite.sprite('alert', $include-size: true, $mode: 'mask', $variables: ('color': #f00));
}
```

Substitution happens **at compile time**: each call site gets its own copy of the icon with the values already inlined. Nothing is resolved in the browser, so this works everywhere, but every themed call site adds one more copy of the icon to your CSS bundle. A themable icon also carries a second data URI in the generated stylesheet, the tokenised template the mixin substitutes into, so its entry there is about twice the size of a plain one. Icons that declare nothing cost nothing: no template URI and no defaults map are written for a set where nothing is themable. The mixin is the only thing that can read a template URI, so [`styles.include`](/options/styles) without `'mixin'` drops it too.

## Runtime theming with real CSS custom properties

A `var()` is left as-is in the generated spritemap, so it stays a genuine CSS custom property. Set it on a `<use>` element, or anywhere above it, and the browser resolves it: custom properties are inherited, and inherited properties cascade into the shadow tree a `<use>` creates. This works with the ordinary external reference — nothing has to be inlined.

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

An `<img>`, a CSS `background-image` and a data URI are each rendered as an independent document that the page's cascade never reaches, so a `var()` there can only fall back to its default. That is why the plugin bakes the defaults into the data URI it writes into your stylesheet, and why the mixin substitutes at compile time instead.

So the two mechanisms cover each other: `<use>` gets runtime theming for free, and the stylesheet path gets compile-time substitution.

## Language support

| Language | Support |
| --- | --- |
| `scss` | full |
| `styl` | full |
| `less` | full, but a list of pairs instead of a map, and no warnings |
| `css` | defaults only, there is no mixin to pass values to |

All three preprocessors produce a byte-identical document once the data URI is decoded. Less is the one that cannot warn you about mistakes: it has no `@warn`, so an unknown variable name is silently a no-op and passing variables alongside `@type: 'fragment'` is silently ignored. In a set where **no** icon declares a variable, SCSS and Stylus skip the defaults map and warn if you pass variables anyway; Less cannot test a variable for existence, so its map is written either way, holding a `0` per sprite, and the mixin quietly falls back to the untouched icon.

## Rules and edge cases

- **A default may be omitted.** `var(--color)` and `var(--color,)` both default to an empty value, which makes the attribute invalid and lets the element inherit instead.
- **A default may contain commas and parentheses.** Only the first top-level comma separates the name from the default, so `var(--shadow, rgba(0,0,0,.5))` works.
- **Several variables can share one attribute value**, e.g. `stroke-dasharray="var(--a, 2) var(--b, 4)"`.
- **One name can be reused across attributes and elements.** Declare the same default each time; if the defaults disagree, the first one wins and the plugin warns.
- **Names must start with a letter** and contain only letters, digits, `-` and `_`. Anything else is left untouched and warned about.
- **A `style` attribute works too**, and is the only option for a property with no usable presentation attribute (`transform-origin`, `mix-blend-mode`). `style="mix-blend-mode:var(--blend, normal)"` is extracted and overridable like any other attribute, and a style declaration also beats a presentation attribute in the cascade. Note the icon is optimized less: OXVG cannot read an unresolvable value in a style declaration without aborting, so `convertPathData`, `mergePaths`, `removeHiddenElems` and `removeUselessStrokeAndFill` are skipped for it ([oxvg#264](https://github.com/noahbald/oxvg/issues/264)).
- **A `<style>` element works as well**, which is the only way to theme a state or a media query: `.icon:hover { fill: var(--hover, red) }` cannot be written as an attribute, and the optimizers leave such a rule in place instead of inlining it. An internal `<style>` applies inside a data URI, so compile-time substitution reaches it like any attribute. Rules are not parsed, so the cascade stays the browser's job.
- **`var()` is matched case-insensitively**, as CSS matches a function name, so `VAR(--color, #fff)` is picked up like any other. A name ending in `var`, such as `myvar(…)`, is not a `var()` call and is left alone.
- **A literal `___name___` in the source collides with the token of that name.** Substitution is textual all the way through, in the plugin and in the mixins alike, so an `id="___color___"` sitting next to a `var(--color, red)` is rewritten too. Avoid triple underscores in an icon's own ids and class names.
- **Values are escaped for you.** A `#`, `%`, quote or `&` in an override is encoded so the data URI stays valid, so you can pass `#f00` directly. All three preprocessors apply the same escaping. A default is escaped a little less: it comes out of the SVG source, where an `&` or a `<` is already written as an entity, so `var(--font, &quot;Fira Sans&quot;, serif)` keeps rendering as `"Fira Sans", serif` whether you override a sibling variable or not.
- **A `;` or a `}` in an override is not inert in CSS.** The escaping keeps the data URI valid, not the declaration isolated, so `$variables: ('color': 'red;stroke:blue')` compiles to `style="fill:red;stroke:blue"` and adds a declaration, and the same applies inside a `<style>` rule. In a presentation attribute the value would simply be invalid. Harmless either way since the values come from your own stylesheet, but do not count on those characters being literal.
- **`var()` and `url()` as override values do not reach the page.** They land inside the data URI, which is its own document: a `var()` there falls back to its own default rather than reading the page's custom property, and a `url(#id)` points at whatever the icon itself happens to contain, under the id the optimizer gave it. The SCSS and Stylus mixins warn.
- **A `url(#id)` *default* is fine.** It travels through the optimizer with the rest of the source, so `cleanupIds` renames it along with the element it points at, and the reference still resolves once the icon is inlined. Only a default pointing at an external file is warned about, since a data URI cannot load one.

## Disabling

```ts
VitePluginSvgSpritemap('./src/icons/*.svg', {
  variables: false
})
```

Nothing is parsed and no defaults map is generated. See [`variables`](/options/#variables) and [`variables.spritemap`](/options/#variables-spritemap) for the full option reference.
