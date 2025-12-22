# Agent Guide: vite-plugin-svg-spritemap

This document provides essential context for AI agents working on this codebase.

## Project Overview

**vite-plugin-svg-spritemap** is a Vite plugin that generates a single SVG spritemap from multiple SVG files. It creates `<symbol>`, `<view>`, and `<use>` elements for each SVG, enabling efficient icon usage in web applications. The plugin supports Vite 6 and 7.

### Key Features
- Generates a single spritemap file from multiple SVG files
- Supports SVG optimization via SVGO or OXVG
- Generates CSS/SCSS/Stylus/Less stylesheets
- Vue.js component integration
- Hot Module Replacement (HMR) support
- Multiple plugin instances support

## Architecture

### Entry Point
- **`src/index.ts`**: Main plugin entry point. Exports `VitePluginSvgSpritemap` function that returns an array of Vite plugins.

### Plugin Structure
The plugin is split into four sub-plugins:
1. **`plugins/common.ts`**: Initializes the SVGManager when Vite config is resolved
2. **`plugins/build.ts`**: Handles build-time spritemap generation
3. **`plugins/dev.ts`**: Handles development server integration and HMR
4. **`plugins/vue.ts`**: Provides Vue component integration for SVG fragments

### Core Components

#### SVGManager (`src/svgManager.ts`)
Central class managing SVG files and spritemap generation:
- **`update(filePath, mode, loop)`**: Updates/adds a single SVG to the spritemap
- **`delete(filePath)`**: Removes an SVG from the spritemap
- **`updateAll(mode)`**: Bulk updates all SVGs matching the glob pattern
- **`spritemap`**: Getter that generates the final SVG spritemap XML
- Manages SVG optimization (SVGO/OXVG)
- Handles style file generation
- Tracks SVG dimensions, viewBox, and IDs

#### Types (`src/types.ts`)
Comprehensive TypeScript definitions:
- `UserOptions`: User-facing configuration options
- `Options`: Internal normalized options
- `SvgMapObject`: Internal representation of an SVG file
- `Shared`: Shared state between plugins
- `OptionsOutput`, `OptionsStyles`, `OptionsRoute`: Configuration sub-objects

### Helper Modules (`src/helpers/`)
- **`options.ts`**: Normalizes and validates user options
- **`svgo.ts`**: SVGO optimization integration
- **`oxvg.ts`**: OXVG optimization integration
- **`cleanAttributes.ts`**: Cleans SVG attributes for symbol/view elements
- **`calculateY.ts`**: Calculates Y position for sprite layout (gutter support)
- **`filename.ts`**: Filename utilities
- **`log.ts`**: Logging utility

### Styles (`src/styles/`)
- **`styles.ts`**: Generates CSS/SCSS/Stylus/Less stylesheets
- Template files: `template.scss`, `template.less`, `template.styl`

## Key Concepts

### Spritemap Generation
The plugin generates an SVG spritemap containing:
- **`<symbol>` elements**: For `<use>` tag references
- **`<view>` elements**: For fragment URLs (e.g., `#sprite-icon-view`)
- **`<use>` elements**: Optional preview elements in the spritemap

### ID Generation
- Default prefix: `sprite-`
- IDs are generated via the `idify` function (default: filename without extension)
- IDs must be unique; warnings are logged for duplicates

### SVG Optimization
- Supports SVGO (default, if available)
- Supports OXVG (fallback, if SVGO unavailable)
- Optimization is lazy-loaded to avoid unnecessary dependencies

### Route
- Default route: `/__spritemap`
- Serves the spritemap in development
- Can be customized via `options.route`

## Development Workflow

### Building
```bash
pnpm build          # Build once
pnpm build:watch    # Watch mode
```

### Testing
```bash
pnpm test           # Run tests
pnpm coverage       # Generate coverage report
```

### Code Quality
```bash
pnpm lint           # Lint code
pnpm lint:fix       # Auto-fix linting issues
pnpm typecheck      # Type checking
```

### Documentation
```bash
pnpm docs:dev      # Dev server
pnpm docs:build    # Build docs
```

## Testing Strategy

Tests are located in `test/` directory:
- Uses Vitest for testing
- Snapshot tests for output validation
- Tests cover:
  - Development server behavior
  - Build output
  - Vue integration
  - Multiple plugin instances
  - Style generation
  - SVG optimization
  - ID generation
  - Gutter calculations

## Common Tasks

### Adding a New Feature
1. Update types in `src/types.ts` if needed
2. Add option handling in `src/helpers/options.ts`
3. Implement feature in relevant plugin or SVGManager
4. Add tests in `test/`
5. Update documentation in `docs/`

### Modifying SVG Processing
- Most SVG processing logic is in `SVGManager` class
- Optimization logic is in `helpers/svgo.ts` and `helpers/oxvg.ts`
- Attribute cleaning is in `helpers/cleanAttributes.ts`

### Adding Style Support
- Modify `src/styles/styles.ts`
- Add template files if needed (SCSS/Less/Stylus)
- Update `OptionsStyles` type

### Debugging
- Check Vite dev server logs for plugin messages
- Use `log()` helper for consistent logging
- Spritemap is accessible at `/__spritemap` route in dev mode

## Important Notes

1. **Shared State**: Plugins share state via `Shared` object containing `svgManager` and `options`
2. **Plugin Order**: Uses `enforce: 'pre'` to run before other plugins
3. **HMR**: Dev plugin handles file watching and HMR updates
4. **Build Output**: Build plugin generates the spritemap as a static asset
5. **Vue Integration**: Vue plugin enables importing SVG fragments as components
6. **Multiple Instances**: Each plugin instance needs a unique route to avoid conflicts

## Dependencies

### Core Dependencies
- `@xmldom/xmldom`: XML parsing and manipulation
- `picomatch`: Glob pattern matching
- `tinyglobby`: File globbing
- `hash-sum`: Content hashing
- `mini-svg-data-uri`: SVG data URI generation

### Optional Peer Dependencies
- `svgo`: SVG optimization (optional)
- `@oxvg/napi`: Alternative SVG optimization (optional)
- `vue`: Vue component support (optional)

## File Structure

```
src/
├── index.ts              # Main plugin entry
├── types.ts              # TypeScript definitions
├── svgManager.ts         # Core SVG management
├── client.d.ts           # Client-side types
├── events.d.ts           # Event types
├── helpers/              # Utility functions
├── plugins/              # Vite plugin implementations
└── styles/               # Style generation

test/
├── fixtures/             # Test fixtures
├── helper/               # Test utilities
└── *.test.ts             # Test files

docs/                     # Documentation (VitePress)
demo/                     # Example projects
```

## Configuration Examples

### Basic Usage
```ts
VitePluginSvgSpritemap('./src/icons/*.svg')
```

### With Options
```ts
VitePluginSvgSpritemap('./src/icons/*.svg', {
  prefix: 'icon-',
  svgo: true,
  styles: {
    filename: 'src/styles/spritemap.scss',
    lang: 'scss'
  }
})
```

## When Making Changes

1. **Always update types** if changing options or data structures
2. **Update tests** when adding features or fixing bugs
3. **Check plugin order** - ensure `enforce: 'pre'` is appropriate
4. **Consider HMR** - ensure changes work in both dev and build modes
5. **Test multiple instances** - verify multiple plugin instances work correctly
6. **Update documentation** - keep docs in sync with code changes
