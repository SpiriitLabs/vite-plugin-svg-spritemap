# Changelog

All notable changes to `@spiriit/vite-plugin-svg-spritemap` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries prior to this file were reconstructed from git tags and commit history,
so early releases summarise the most user-facing changes rather than every commit.

## [Unreleased]

### Fixed

- Icons with a comma-separated `viewBox`, such as `viewBox="0,0,32,32"`, were
  skipped as if they had no dimensions. Whitespace and commas are both valid
  separators ([#117]).

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

[Unreleased]: https://github.com/SpiriitLabs/vite-plugin-svg-spritemap/compare/v7.1.0...HEAD
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
