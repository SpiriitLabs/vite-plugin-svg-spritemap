/// <reference types="./events" />

declare module '*.svg?use' {
  import type { FunctionalComponent, SVGAttributes } from 'vue'

  const src: FunctionalComponent<SVGAttributes>
  export default src
}

declare module '*.svg?view' {
  import type { FunctionalComponent, ImgHTMLAttributes } from 'vue'

  const src: FunctionalComponent<ImgHTMLAttributes>
  export default src
}

// This file is an ambient script, so anything declared at top level would land
// in every consumer's global scope. The spritemap shape is therefore repeated
// inside each module block rather than named once outside them.

declare module 'virtual:spritemap' {
  const spritemap: {
    /** Base-aware and hashed in dev, the emitted asset path in build */
    url: string
    /** The instance's `route.name` */
    name: string
    /** The configured `prefix`, already applied by `href` */
    prefix: string
    /** Icon ids, sorted and unprefixed, as in the generated `Icons` union */
    icons: string[]
    /** `url#<prefix><icon>`, ready for a `<use>` reference */
    href: (icon: string) => string
  }
  export default spritemap
}

declare module 'virtual:spritemap?url' {
  const url: string
  export default url
}

declare module 'virtual:spritemap?raw' {
  const source: string
  export default source
}

// `virtual:spritemap/<route name>`, to pick one of several instances. The two
// query patterns share a prefix with the bare one, so they must be declared
// first: with equal prefixes TypeScript keeps the pattern it saw first, and the
// bare one would otherwise type `?url` / `?raw` as the object.
declare module 'virtual:spritemap/*?url' {
  const url: string
  export default url
}

declare module 'virtual:spritemap/*?raw' {
  const source: string
  export default source
}

declare module 'virtual:spritemap/*' {
  const spritemap: {
    url: string
    name: string
    prefix: string
    icons: string[]
    href: (icon: string) => string
  }
  export default spritemap
}
