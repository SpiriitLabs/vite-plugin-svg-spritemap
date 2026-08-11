---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "vite-plugin-svg-spritemap"
  tagline: A Vite plugin to generate svg spritemap
  actions:
    - theme: brand
      text: Getting started
      link: /guide/
    - theme: alt
      text: Options
      link: /options

features:
  - title: Pack your SVG files in one spritemap file
    details: Combines all SVGs into one file for better performance.
    icon: 📦
  - title: Flexible SVG Usage in Tags and Styles
    icon: ✨
    details: Use your SVGs in &lt;svg> or &lt;img> tags, or directly in CSS/SCSS/Stylus/Less.
  - title: Import SVG Fragments as VueJS Components
    icon: 🍕
    details: Easily import SVG fragments as VueJS components
  - title: Theme an Icon per Usage with Variables
    icon: 🎨
    details: Mark any value with var() and override it from the mixin at each call site, or theme it live with CSS custom properties.
  - title: Hot Module Replacement (HMR) Support
    icon: 🔥
    details: Real-time updates with HMR for faster development.
  - title: Optional SVGO or OXVG Optimization
    icon: ⚙️
    details: Optimize your SVGs with SVGO or OXVG for better performance and smaller file sizes.

---
