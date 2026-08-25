# Variables

An icon inlined into your CSS as a data URI is frozen: its colors and stroke widths are whatever the `.svg` file shipped with. The same icon in three colors normally means three files.

A variable removes that. Mark a value in the SVG as themable, once, and override it wherever the icon is used.

## The short version

Mark the values you want to theme with a standard CSS `var()`:

```xml
<!-- src/icons/alert.svg -->
<svg viewBox="0 0 24 24">
  <path fill="var(--color, #fff)" stroke-width="var(--weight, 2)" d="…"/>
</svg>
```

This is still a normal SVG. `var()` is valid CSS, so editors and optimizers leave it alone and the file opens on its own in `#fff`.

From a stylesheet, override it per call site with the mixin:

::: code-group
```scss [SCSS]
.alert         { @include sprite.sprite('alert'); }
.alert--danger { @include sprite.sprite('alert', $variables: ('color': #f00)); }
```

```styl [Stylus]
.alert
	sprite('alert')
.alert--danger
	sprite('alert', $variables: { 'color': #f00 })
```

```less [Less]
.alert         { .sprite('alert'); }
.alert--danger { .sprite('alert', @variables: 'color' '#f00'); }
```
:::

From markup, set the custom property and let the browser resolve it:

```css
.icon--danger { --color: #f00; }
```

```html
<svg class="icon icon--danger"><use href="/__spritemap#sprite-alert"></use></svg>
```

One declaration, two ways to theme it. Which one you get depends on how you use the icon, see [Which path applies](#which-path-applies).

## Declaring a variable

Write `var(--name, default)` where you want a themable value. The name is the custom property without its `--` prefix, so the icon above declares `color` and `weight`.

- **Names** start with a letter and contain only letters, digits, `-` and `_`. Anything else is left untouched, with a warning.
- **The default is optional.** `var(--color)` resolves to an empty value, which makes the attribute invalid and lets the element inherit instead.
- **A default can hold commas and parentheses.** Only the first top-level comma separates the name from it, so `var(--shadow, rgba(0,0,0,.5))` works.
- **One attribute can hold several**, as in `stroke-dasharray="var(--a, 2) var(--b, 4)"`.
- **One name can be reused** across attributes and elements. Give it the same default each time; if two disagree, the first wins and the plugin warns.

::: tip `currentColor` follows your text color, through `<use>` only
`fill="var(--color, currentColor)"` is the idiomatic pairing. A `<use>` inherits `color` into its shadow tree, so an unset `--color` falls back to the surrounding text color, and setting it still wins.

It does not survive the trip into a data URI. There, `currentColor` resolves against that document's own initial color and paints black. Wherever the icon is inlined, override the variable rather than leaning on the fallback.
:::

::: details A few more rules you are unlikely to hit
**An omitted default is not a disagreement.** A later real one takes over silently, so `var(--color)` and `var(--color, #fff)` side by side both resolve to `#fff`.

**Avoid `___` in your own ids and class names.** Substitution is textual, in the plugin and in the mixins alike, so an `id="___color___"` sitting next to a `var(--color, red)` is rewritten along with it.

**`var()` is matched case-insensitively**, as CSS matches any function name, so `VAR(--color, #fff)` is picked up like any other. A name that merely ends in `var`, such as `myvar(…)`, is not a `var()` call and is left alone.
:::

### Where a `var()` can go

A presentation attribute is the common case. Two other places work, and each reaches something an attribute cannot express:

| Where | Use it for |
| --- | --- |
| A presentation attribute | `fill`, `stroke`, `stroke-width`, anything with an attribute form |
| A `style` attribute | properties with no presentation attribute, such as `mix-blend-mode` and `transform-origin` |
| A `<style>` element | states and media queries, such as `:hover` and `@media` |

```xml
<svg viewBox="0 0 24 24">
  <style>.alert-shape:hover { fill: var(--hover, #f00) }</style>
  <path class="alert-shape" d="…" style="mix-blend-mode:var(--blend, normal)"/>
</svg>
```

A `style` attribute is extracted and overridable like any other attribute, and it beats a presentation attribute in the cascade. A `<style>` element survives the optimizers instead of being inlined away, and it applies inside a data URI too, so compile-time substitution reaches it like anything else.

Rules inside a `<style>` element are never parsed, only scanned as text, so which elements a rule matches stays up to the browser, and a `var()` written in a selector is substituted like one in a declaration.

::: warning A `<style>` rule is not scoped to its icon
It is not confined to its `<symbol>` in the spritemap, whether or not it carries a variable, which is why the class above is named after the icon. See [Styles inside an icon](/guide/styles-inside-an-icon).
:::

::: tip A themed icon is optimized a little less under OXVG
OXVG reads an unresolvable `var()` stroke as "no stroke" and deletes it, so `removeUselessStrokeAndFill` is skipped for **any** icon carrying a `var()`, a presentation attribute included. It also cannot read one in a style declaration without aborting, so `convertPathData`, `mergePaths` and `removeHiddenElems` are skipped as well for an icon whose `var()` sits in a `style` attribute or a `<style>` element ([oxvg#264](https://github.com/noahbald/oxvg/issues/264)).

[SVGO](/options/#svgo) is unaffected on both counts: it treats a `var()` as a dynamic value and skips the element instead of mangling it, so it keeps optimizing themed icons in full.
:::

## Which path applies

You do not choose between the two mechanisms, the way you use the icon does:

| How the icon is used | Theming |
| --- | --- |
| `<use>`, external or inlined | runtime, via CSS custom properties |
| `?use` component | runtime, it is a `<use>` like any other |
| Generated stylesheet (`background` / `mask`) | compile time, via `$variables` / `@variables` |
| `<img src="…#sprite-alert-view">`, and `?view` | none, the default is used |
| `background-image: url('…#sprite-alert-view')`, and `$type: 'fragment'` | none, the default is used |

An `<img>`, a CSS `background-image` and a data URI are each rendered as an independent document that your page's cascade never reaches, so a `var()` there can only fall back to its default. That is why the plugin bakes the defaults into the data URI it writes into your stylesheet, and why the mixin substitutes at compile time instead.

The two cover each other: `<use>` gets runtime theming for free, and the stylesheet path gets compile-time substitution.

## Theming at runtime with `<use>`

The generated spritemap keeps your `var()` as written, so it stays a genuine CSS custom property. Set it on a `<use>` element, or anywhere above it, and the browser resolves it: custom properties are inherited, and inherited properties cascade into the shadow tree a `<use>` creates. The ordinary external reference is enough, nothing has to be inlined.

```css
.icon          { --color: #333; }
.icon--danger  { --color: #f00; --weight: 3; }
```

```html
<svg class="icon"><use href="/__spritemap#sprite-alert"></use></svg>
<svg class="icon icon--danger"><use href="/__spritemap#sprite-alert"></use></svg>
```

Nothing else is required: no stylesheet output, no mixin, no build-time list of the values you intend to use.

## Overriding from the mixin

The mixin takes a `$variables` map, a list of pairs in Less. Every variable the icon declares and you do not override keeps its default.

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

`$variables` is the last argument, so it composes with the others:

::: code-group
```scss [SCSS]
.alert--mask {
  @include sprite.sprite('alert', $include-size: true, $mode: 'mask', $variables: ('color': #f00));
}
```

```styl [Stylus]
.alert--mask
	sprite('alert', $include-size: true, $mode: 'mask', $variables: { 'color': #f00 })
```

```less [Less]
.alert--mask {
  .sprite('alert', @include-size: true, @mode: 'mask', @variables: 'color' '#f00');
}
```
:::

::: warning Less takes a list of pairs, separated by `;`
Less has no map literal, so variables go in as a comma-separated list of `'name' value` pairs.

- **Separate the mixin arguments with `;`** as soon as you pass more than one pair, since Less reads a comma inside a mixin call as an *argument* separator: `.sprite('alert'; @variables: 'color' '#f00', 'weight' 3)`. A single pair works with either separator.
- **Quote your keys.** A value containing a space works either way, quoted (`'dash' '2 4'`) or not (`'dash' 2 4`), since everything past the name is folded back into one value.
- **A value containing a comma must be quoted.** Unquoted, it starts the next pair, and Less has no `@warn` to tell you: `'font' Arial, sans-serif` substitutes `Arial` alone. Write `'font' 'Arial, sans-serif'`.
- **`@route` comes before `@mode`**, the reverse of SCSS and Stylus, kept that way so `@mode` did not shift an existing positional call. The signatures are `.sprite(@name, @include-size, @type, @route, @mode, @variables)` against `sprite($name, $include-size, $type, $mode, $route, $variables)`. Name your arguments and it never comes up.
:::

### What a value may contain

Your value is substituted into the icon's data URI, which is its own document, cut off from your page. Almost anything passes through untouched. Three kinds do not:

- **`var()` and `url()` do not reach your page.** A `var()` falls back to its own default instead of reading your custom property, and a `url(#id)` points at whatever the icon itself contains, under the id the optimizer gave it. Pass a resolved value. The SCSS and Stylus mixins warn.
- **`currentColor` paints black**, for the same reason: it resolves against the data URI's own initial color. Pass the color itself. The mixins stay quiet here, since a name that merely contains the word would trip the same check.
- **A `;` or a `}` still ends a declaration.** Escaping keeps the URI valid, it does not fence off the declaration: `('color': 'red;stroke:blue')` compiles to `style="fill:red;stroke:blue"` and quietly adds one. Harmless with your own values, but do not count on those characters staying literal.

Everything else is escaped for you. A `#`, `%`, quote or `&` is encoded so the URI stays valid, the same way in all three languages, so `#f00` goes in as written.

::: details Passing a literal backslash
The data URI sits inside a `url("…")`, which is a CSS string, so a raw `\` would open an escape sequence there: `"\2014"` would arrive as an em dash, and `"\g"` would lose its backslash. The plugin encodes it, but only once it sees it, and your preprocessor resolves the escapes in its own string literals first. Spell it for the language you are in:

| SCSS | Stylus | Less |
| --- | --- | --- |
| `'\\2014'` | `'\2014'` | `'\2014'` |
:::

::: details How a default differs from a value you pass
A default written in the SVG goes through the same machinery, with two differences:

**It is escaped one step less**, since the SVG source already spells an `&` or a `<` as an entity. So `var(--font, &quot;Fira Sans&quot;, serif)` keeps rendering as `"Fira Sans", serif`, whether or not you override a sibling variable.

**A `url(#id)` default is fine**, unlike one you pass. It travels through the optimizer with the rest of the icon, so `cleanupIds` renames it along with the element it points at and the reference still resolves. Only a default pointing at an external file is warned about, since a data URI cannot load one.

A default is also normalized: a run of whitespace collapses to a single space, so one wrapped across several lines still resolves to a single value, and a quote of either kind becomes an entity, since a data URI delimits every attribute with `'`. This is identical everywhere a default lands, [`variables.spritemap: 'resolve'`](/options/#variables-spritemap) included, so overriding one variable never changes how an untouched sibling renders.
:::

### What it costs

Substitution happens **at compile time**: each call site gets its own copy of the icon with the values already inlined. Nothing is resolved in the browser, so it works everywhere, and you pay for it in CSS:

- Every themed call site adds one more copy of the icon.
- A themable icon carries a second data URI in the generated stylesheet, the tokenised template the mixin substitutes into, so its entry is about twice the size of a plain one.

Icons that declare nothing cost nothing: no template URI, and in SCSS and Stylus no entry in the defaults map, which is not written at all for a set where nothing is themable. Only the mixin can read a template URI, so [`styles.include`](/options/styles) without `'mixin'` drops it too.

## Language support

| Language | Support |
| --- | --- |
| `scss` | full |
| `styl` | full |
| `less` | full, but a list of pairs instead of a map, and no warnings |
| `css` | defaults only, there is no mixin to pass values to |

All three preprocessors produce a byte-identical document once the data URI is decoded. They differ in what they can tell you:

- **Less cannot warn.** It has no `@warn`, so an unknown variable name is silently a no-op, and passing variables alongside `@type: 'fragment'` is silently ignored.
- **Less cannot test a variable for existence either**, so its defaults map is written for every sprite, with a `0` for the ones that declare nothing, and the mixin quietly falls back to the untouched icon.
- **SCSS and Stylus** read a missing entry back as an empty map and warn from there, so they list only the icons that declare something, and skip the map entirely when no icon does.

## Disabling

```ts
VitePluginSvgSpritemap('./src/icons/*.svg', {
  variables: false
})
```

Nothing is parsed and no defaults map is generated. The `var()` you authored is left untouched everywhere it lands, so the spritemap stays themable at runtime through the cascade and a data URI renders the default; only the compile-time substitution goes away. The mixin keeps working, and warns if a call site still passes `$variables`.

This, not [`styles.include`](/options/styles.html#styles-include), is the switch for the feature: an `include` entry says which declarations the stylesheet holds, and dropping `'data'` would take the sprites map the mixin looks an icon up in with it. See [`variables`](/options/#variables) and [`variables.spritemap`](/options/#variables-spritemap) for the full option reference.
