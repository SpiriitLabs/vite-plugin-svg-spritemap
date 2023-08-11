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
