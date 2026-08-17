# Changelog

All notable changes to `@spiriit/vite-plugin-svg-spritemap` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries prior to this file were reconstructed from git tags and commit history,
so early releases summarise the most user-facing changes rather than every commit.

## [7.2.0] - 2026-08-11

### Added

- Icon variables. A `var(--name, default)` in an svg presentation attribute, a
  `style` attribute or a `<style>` element becomes a themable value: the
  generated SCSS, Stylus and Less mixin takes a `$variables` map, a list of
  `'name' value` pairs in Less, to override it per call site. A `style`
  attribute reaches a property with no presentation attribute of its own
  (`mix-blend-mode`, `transform-origin`), and a `<style>` element is the only way
  to theme a state or a media query. Substitution happens at compile time, so
  each call site gets its own copy of the icon with the values inlined. The
  emitted spritemap keeps the
  `var()` as a real custom property, so a `<use>` element is themable at runtime
  through the CSS cascade as well, external reference included. Adds the
  `variables` and `variables.spritemap` options, plus a `styles.names.variables`
  name for the generated defaults map. Inspired by the same feature in
  [svg-spritemap-webpack-plugin], with a standard `var()` notation in place of
  its `var:name.attribute` xml namespace.

- The option and sprite types are exported from the package entry point, so a
  config built outside `vite.config.ts` and a `styles.callback` or `idify`
  extracted to a named function can be typed: `UserOptions`, the resolved
  `Options`, `SvgMapObject`, `SvgDataUriMapObject`, `SvgVariables`, the option
  shapes themselves, and `StylesCallback` with its parts
  (`StylesCallbackContext`, `SpritemapGenerator`). Only the plugin's internal
  plumbing stays unexported.

### Fixed

- An icon carrying a `var()` was mangled by OXVG. Its
  `removeUselessStrokeAndFill` job reads an unresolvable `var()` as "no stroke"
  and deleted `stroke` along with every sibling `stroke-*`; worse, a `var()`
  inside a `style` attribute or a `<style>` element made four jobs panic through
  the native binding, aborting the whole build or dev server with a signal no
  `try`/`catch` could intercept. `removeUselessStrokeAndFill` is now dropped for
  any icon containing a `var()`, plus `convertPathData`, `removeHiddenElems` and
  `mergePaths` when that `var()` sits in a style declaration, user-supplied
  `oxvg` configurations included. Those icons are optimized slightly less until
  [oxvg#264] is fixed upstream.
- The Less mixin had no `@mode` parameter, so `.sprite('name', @mode: mask)`
  failed with "no matching definition" while the SCSS and Stylus mixins both
  accepted it.
- The Less mixin silently dropped part or all of its output when a keyword
  argument was spelled the other way round. `@mode: 'mask'`, the quoting the
  documentation uses at every other call site, emitted `'mask':` with the quotes
  the browser discards; `@include-size: box` matched no guard, so the sizing was
  skipped; and `@type: fragment` matched neither branch, so nothing was emitted at
  all. SCSS and Stylus read the two spellings as one value, and now so does Less.
- `styles.include: ['mixin']` generated a stylesheet that could not compile. The
  mixin looks every sprite up in the map the `'variables'` entry declares, so
  without it the first call was an undefined variable in SCSS, Stylus and Less
  alike. `'variables'` is now added back with a warning.
- A `null` `svgo` or `oxvg` option, which is what a conditional config produces
  (`oxvg: isProd ? jobs : null`), was taken for a configuration object. OXVG
  received it as "run your own preset", the one thing the `var()` mitigations
  above exist to avoid, so an icon with a `var()` in a style declaration aborted
  the process; SVGO read it as a config with no plugins and threw per icon. Both
  now fall back to the default configuration, as an omitted option does.

## [7.1.1] - 2026-08-10

### Changed

- The SVGO or OXVG configuration is built once when the optimizer loads instead
  of being rebuilt for every icon ([#119]).
- Content hashes are computed with `node:crypto` instead of the `hash-sum`
  dependency, which has been removed. Generated `[hash]` filenames and the dev
  cache-busting token change once after upgrading ([#121]).
- A single-icon change during dev no longer regenerates everything: unchanged
  icons keep their encoded data URI, the style template is read from disk once
  per language, and the styles and types files are only rewritten when their
  content actually changed. A file that is missing from disk is always written
  again, so removing a generated file still brings it back ([#122]).

### Removed

- The unused `c8` and `@types/xmldom` devDependencies ([#121]).

### Fixed

- A custom `styles.names` entry or a route containing `$$` or `$&` came out
  corrupted in the generated mixin, because those are replacement patterns for
  `String.replace` ([#119]).
- Watched icon directories are derived with `path.dirname`, so they resolve on
  Windows paths too ([#119]).
- Icons with a comma-separated `viewBox`, such as `viewBox="0,0,32,32"`, were
  skipped as if they had no dimensions. Whitespace and commas are both valid
  separators ([#117]).
- Vue components were skipped entirely when `vite:vue` sat inside a nested
  plugin array, a normal shape for presets and conditional plugin lists
  ([#118]).
- `?use` and `?view` ids carrying extra params were not recognised as component
  requests: the `&t=…` Vite appends on a hot update broke the import, and
  `?view&lang.js` rendered a `<use>` element instead of an image ([#118]).
- Vue-rendered references now carry the dev cache-busting hash that HTML and
  other modules already received, so an edited icon is no longer served from the
  browser cache ([#118]).
- When the OXVG native binding fails to load (no prebuilt binding exists for
  musl/Alpine or ARM Linux), the warning now names the platform and suggests
  SVGO or `oxvg: false`, instead of a raw loader error. The supported platforms
  are documented in the `oxvg` option section ([#123]).
- Rebuilding the icon collection no longer keeps the previous run's state, so
  icons deleted in between are dropped from the spritemap and every icon no
  longer warns about colliding with its own stale entry. Genuine collisions
  between two icons of the same run are still reported ([#124]).
- An array passed to `build.rollupOptions.external` is no longer written to in
  place. The route matcher is contributed through the config the plugin
  returns, so the array you pass keeps its own entries ([#125]).
- `vite build --watch` never rebuilt when an icon changed, because the build
  plugin did not register the icon directories with the watcher the way the dev
  server already did. Editing, adding and deleting an icon now each trigger a
  rebuild with a fresh spritemap ([#126]).
- Removing one of several icons sharing an id no longer frees that id while
  the others still use it, and an icon whose `idify` result changes no longer
  leaves the previous id claimed forever. Both cases reported duplicate ids
  that were not duplicates, or stayed quiet about ones that were ([#127]).
- A relative `width`/`height`, such as `100%` or `1.5em`, was read as that many
  user units, so `width="100%"` became a 100x100 sprite and overrode a perfectly
  good `viewBox`. Relative units and non-positive values now count as no
  dimension at all: the `viewBox` is used when there is one, and the icon is
  skipped with the usual warning when there is not. Absolute units are
  unchanged ([#128]).
- The dev HMR client was only injected when the entry HTML contained a
  lowercase `</body>`. An uppercase end tag, whitespace before its `>`, or an
  entry with no body tag at all left the client out with no warning, so icons
  rendered but never hot-updated ([#129]).
- `injectSvgOnDev: false` was overridden by a leftover `injectSVGOnDev: true`,
  so the deprecated option won over the current one during a migration
  ([#130]).
- A style filename with an uppercase extension, such as `out.SCSS`, produced
  plain CSS and an "invalid styles lang" warning. Extensions are matched
  case-insensitively now ([#131]).
- `styles.callback` output was thrown away when `styles.include` was `false`,
  leaving an empty file. `include` selects which generated blocks are emitted,
  so it no longer suppresses your own callback content. With no callback the
  file stays empty, as before ([#131]).
- A `route` of `/`, which `route: ''` also resolved to, made the dev server
  answer the site root with the spritemap and hid the application. It now warns
  and falls back to `/__spritemap` ([#132]).

## [7.1.0] - 2026-07-27

### Added

- `output.hrefAttribute` option to control the reference emitted on generated
  `<use>` elements: `'xlink:href'` (default), `'href'`, or `'both'`. Based on
  ([#99]) by @ChrisAdels.
- Object form for the `types` option with a `groups` key, generating several
  named union types from a single spritemap. Based on ([#108]) by @spaansba.
- This changelog.

### Changed

- The spritemap is now generated once per icon-set change instead of once per
  access. It was re-parsed and re-serialized on every read: three times per
  build, once per dev-server request to the route, and up to three times per
  icon change in dev ([#111]).
- The dev server answers the spritemap route only on an exact `GET` match, or
  the route plus its `__<hash>` suffix. A prefix match meant a second plugin
  instance on a route sharing the prefix never received its own requests.
- Type generation no longer emits `Prefix` and `IconsPrefixed` when
  `prefix: false`. Based on ([#107]) by @spaansba.

### Fixed

- `oxvg: true` barely optimized anything: it passed an empty job list, which OXVG
  reads as every job disabled. It now runs the `svgo` default configuration
  translated to OXVG jobs, so both optimizers produce the same output.
- A short route, or one containing regex metacharacters, could rewrite
  unrelated imports during build. `route: '/fla'` matched inside
  `svelte/internal/flags/async` and corrupted that specifier ([#97]).
- `output.name` had no effect on the emitted filename; its base name now fills
  the `[name]` token of `output.filename` ([#112]).
- New icons were ignored in dev on Windows until the server restarted ([#96]).
- One malformed SVG aborted the whole build or dev startup. It is now skipped
  with a warning naming the file ([#110]).
- The dev cache-busting hash was computed before the icons were sorted, so it
  described an ordering that was never served ([#111]).
- Silent failures now warn: an empty glob, and any icon skipped for missing
  dimensions ([#114]).
- The deprecated `injectSVGOnDev` casing warns, and optimizer errors name the
  optimizer actually in use ([#115]).
- The `createSpritemap` docs example used the wrong callback signature
  ([#113]).

## [7.0.1] - 2026-07-20

### Fixed

- Respect the Vite `base` for the `__spritemap` route in dev, and keep relative
  references correct ([#102]).
- Encode internal `url()` references inside the generated style data URI ([#98]).
- Keep the generated style `__route__` token base-agnostic so the output stays
  consistent across dev and build.

## [7.0.0] - 2026-04-01

### Added

- TypeScript icon-name type generation via the `types` option — emit a `.d.ts`
  with a union type of every icon name ([#90]).
- `styles.sizes` option to control the unit and base divisor of the generated
  width/height values (e.g. `px` → `em`/`rem`) ([#95]).
- Vite 8 support.

### Fixed

- Nuxt `viteEnvironmentApi` handling in dev ([#93]).

## [6.0.0] - 2025-12-22

### Added

- `route.name` option to name the spritemap route (used in logging and style
  generation).
- Typings for the client-side HMR events.

### Changed

- **Breaking:** dropped Node 18 support.
- Share a single `SVGManager` across all plugins, fixing Vue event pollution and
  several multiple-instance issues.
- Switched HMR to Vite's `hotUpdate` hook (from the deprecated
  `handleHotUpdate`), and use Vite hook filters for better performance.

### Fixed

- HMR when the spritemap is served from an absolute path.
- Prevent `hotUpdate` from leaking across multiple plugin instances.
- Nuxt TypeScript reference compatibility ([#38]).

## [5.0.0] - 2025-07-29

### Added

- OXVG optimizer support as an alternative to SVGO, via the `oxvg` option ([#80]).

### Changed

- **Breaking:** build moved to tsdown and the CommonJS build was dropped — the
  package is now ESM-only.

## [4.1.0] - 2025-04-29

### Added

- `gutter` option to add spacing (in pixels) between sprites and avoid overlap
  ([#75]).

## [4.0.1] - 2025-03-19

### Fixed

- `idify` typo affecting generated ids ([#71]).

## [4.0.0] - 2025-02-27

### Added

- Documentation site ([#65]).

### Changed

- Process SVGs in parallel for faster builds.
- Replaced `fast-glob` with `tinyglobby` for glob matching.

### Fixed

- Handle SVGs that share the same filename in different directories ([#69]).

## [3.0.1] - 2025-02-26

### Changed

- Dependency updates and maintenance.

## [3.0.0] - 2024-12-09

### Changed

- **Breaking:** renamed the `injectSVGOnDev` option to `injectSvgOnDev`
  (the old name is deprecated).
- **Breaking:** SVGO is now an optional peer dependency — install it only if you
  want SVGO optimization.
- Vite 6 support.

### Fixed

- SCSS warning raised during optimization.

## [2.3.1] - 2024-10-10

### Changed

- Test coverage improvements and maintenance.

## [2.3.0] - 2024-10-09

### Added

- Multiple-instance support via the `route` option, so several spritemaps can be
  generated in one project.
- Style customization: configurable variable/mixin `names`, the `include`
  (mixin) option, and a `callback` to customize the generated stylesheet.

### Fixed

- SVGs without a `viewBox` attribute.
- Style option handling in multi-instance dev mode.

## [2.2.4] - 2024-01-21

### Fixed

- Path formatting on Windows (use Vite's URL segment join).
- Peer dependency declarations.

## [2.2.3] - 2024-01-17

### Fixed

- Vue error raised when the referenced template is not found.
- Vue component with `use: false` ([#43]).
- Vue `view` warning handling.

## [2.2.2] - 2024-01-14

### Fixed

- Svelte `base` handling ([#40]).
- Wrong `href` attribute in the Vue component.

## [2.2.1] - 2024-01-13

### Fixed

- Vue component width/height.
- CJS warning when used with Nuxt ([#37]).

## [2.2.0] - 2024-01-10

### Fixed

- Miscellaneous fixes ([#34]); added a Nuxt demo.

## [2.1.0] - 2023-12-18

### Added

- `idify` option to customize each symbol's id.

## [2.0.1] - 2023-11-28

### Fixed

- Mark `__spritemap` as an external resource ([#30]).

## [2.0.0] - 2023-11-24

### Added

- Optional `prefix` option for sprite ids ([#29]).

### Changed

- **Breaking:** Vite 5 support and full ESM support.

### Fixed

- `ReferenceError: __dirname is not defined` under ESM ([#22]).

## [1.4.0] - 2023-11-08

### Added

- Basic `emitFile` support and a configurable manifest name (with typings).

### Fixed

- Transform issue ([#21]).

## [1.3.0] - 2023-08-11

### Added

- Vue component support (`.svg?use`), with a usage warning in the console.

## [1.2.0] - 2023-08-09

### Added

- `injectSVGOnDev` option to inject the spritemap into the body during dev.

### Fixed

- SVG update path handling.

## [1.1.0] - 2023-08-07

### Added

- `<mask>` element inside the spritemap ([#8]).

## [1.0.2] - 2023-05-23

### Fixed

- Bug fix ([#6]).

## [1.0.1] - 2023-04-18

### Changed

- Switched from Prettier to `@antfu/eslint-config` ([#2]).

## [1.0.0] - 2023-02-24

### Added

- Initial release: generate a symbol-based SVG spritemap from `.svg` files
  matched by a glob, with optional SVGO optimization, stylesheet generation, and
  HMR in dev.

[7.2.0]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v7.1.1...v7.2.0
[7.1.1]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v7.1.0...v7.1.1
[7.1.0]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v7.0.1...v7.1.0
[7.0.1]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v7.0.0...v7.0.1
[7.0.0]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v6.0.0...v7.0.0
[6.0.0]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v5.0.0...v6.0.0
[5.0.0]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v4.1.0...v5.0.0
[4.1.0]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v4.0.1...v4.1.0
[4.0.1]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v4.0.0...v4.0.1
[4.0.0]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v3.0.1...v4.0.0
[3.0.1]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v2.3.1...v3.0.0
[2.3.1]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v2.2.4...v2.3.0
[2.2.4]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v2.2.3...v2.2.4
[2.2.3]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v2.2.2...v2.2.3
[2.2.2]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v2.2.1...v2.2.2
[2.2.1]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v1.4.0...v2.0.0
[1.4.0]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/releases/tag/v1.0.0

[#8]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/8
[#2]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/2
[#6]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/6
[#21]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/21
[#22]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/22
[#29]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/29
[#30]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/30
[#34]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/34
[#37]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/37
[#38]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/38
[#40]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/40
[#43]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/43
[#65]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/65
[#69]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/69
[#71]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/71
[#75]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/75
[#80]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/80
[#90]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/90
[#93]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/93
[#95]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/95
[#98]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/98
[#102]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/102
[#96]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/96
[#97]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/97
[#99]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/99
[#107]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/107
[#108]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/108
[#110]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/110
[#111]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/111
[#112]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/112
[#113]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/113
[#114]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/114
[#115]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/115
[#117]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/117
[#118]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/118
[#119]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/119
[#121]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/121
[#122]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/122
[#123]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/123
[#124]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/124
[#125]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/125
[#126]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/126
[#127]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/127
[#128]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/128
[#129]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/129
[#130]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/130
[#131]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/131
[#132]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/issues/132
[oxvg#264]: https://github.com/noahbald/oxvg/issues/264
[svg-spritemap-webpack-plugin]: https://github.com/cascornelissen/svg-spritemap-webpack-plugin/blob/master/docs/variables.md
