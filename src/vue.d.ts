declare module '*.svguse' {
  import type { FunctionalComponent, SVGAttributes } from 'vue'

  const src: FunctionalComponent<SVGAttributes>
  export default src
}

declare module '*.svgview' {
  import type { FunctionalComponent, ImgHTMLAttributes } from 'vue'

  const src: FunctionalComponent<ImgHTMLAttributes>
  export default src
}
