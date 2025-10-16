import 'vite/types/customEvent.d.ts'

declare module 'vite/types/customEvent.d.ts' {
  interface CustomEventMap {
    'vite-plugin-svg-spritemap:update': { spritemap: string, id: string, route: string }
  }
}
