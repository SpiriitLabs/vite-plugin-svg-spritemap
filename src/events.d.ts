import 'vite/types/customEvent.d.ts'

export interface HMRUpdate {
  spritemap: string
  id: string | null
  route: string
  routeName: string
}

declare module 'vite/types/customEvent.d.ts' {
  interface CustomEventMap {
    'vite-plugin-svg-spritemap:update': HMRUpdate
  }
}
