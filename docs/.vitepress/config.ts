import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'vite-plugin-svg-spritemap',
  description: 'A Vite plugin to generate svg spritemap ',
  base: '/vite-plugin-svg-spritemap/',
  sitemap: {
    hostname: 'https://spiriitlabs.github.io',
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Options', link: '/options' },
      { text: 'Examples', link: '/examples' },
    ],

    sidebar: {
      '/guide': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting started', link: '/guide/' },
            { text: 'Styles', link: '/guide/styles' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Backend Integration', link: '/guide/backend-integration' },
            { text: 'Vue/Nuxt', link: '/guide/vue' },
            { text: 'Customize styles output', link: '/guide/customize-styles-output' },
            { text: 'Multiple Instance', link: '/guide/multiple-instance' },
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
  vite: {
    clearScreen: false,
  },
})
