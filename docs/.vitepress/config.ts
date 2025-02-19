import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'vite-plugin-svg-spritemap',
  description: 'A Vite plugin to generate svg spritemap ',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Options', link: '/options' },
      { text: 'Examples', link: '/examples' },
    ],

    sidebar: [
      { text: 'Getting started', link: '/getting-started' },
      {
        text: 'Advanced',
        items: [
          { text: 'Backend Integration', link: '/backend-integration' },
          { text: 'Vue/Nuxt', link: '/vue' },
          { text: 'Customize styles output', link: '/customize-styles-output' },
          { text: 'Mutliple Instance', link: '/multiple-instance' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/SpiriitLabs/vite-plugin-svg-spritemap' },
    ],
    search: {
      provider: 'local',
    },
  },
})
