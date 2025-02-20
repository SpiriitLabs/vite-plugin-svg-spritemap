import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'vite-plugin-svg-spritemap',
  description: 'A Vite plugin to generate svg spritemap ',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Options', link: '/options' },
      { text: 'Examples', link: '/examples' },
    ],

    sidebar: {
      '/guide': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Styles', link: '/guide/styles' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Backend Integration', link: '/guide/advanced/backend-integration' },
            { text: 'Vue/Nuxt', link: '/guide/advanced/vue' },
            { text: 'Customize styles output', link: '/guide/advanced/customize-styles-output' },
            { text: 'Mutliple Instance', link: '/guide/advanced/multiple-instance' },
          ],
        },
      ],
      '/options': [
        {
          text: 'Options',
          items: [
            { text: 'General options', link: '/options/' },
            { text: 'Output options', link: '/options/output' },
            { text: 'Styles options', link: '/options/styles' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/SpiriitLabs/vite-plugin-svg-spritemap' },
    ],
    search: {
      provider: 'local',
    },
  },
})
