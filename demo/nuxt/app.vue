<script setup lang="ts">
import spritemap from 'virtual:spritemap'
import SpiriitView from './../_fixtures/icons/spiriit.svg?view'
import ViteView from './../_fixtures/icons/vite.svg?view'

// #135: `href` applies the configured prefix, resolved through Nuxt's ssr loader too
const viteHref = spritemap.href('vite')
</script>

<template>
  <h1>Vite Plugin SVG Spritemap Demo with Nuxt</h1>

  <p>This is a demo of the Vite Plugin SVG Spritemap working with VueJS component.</p>

  <div class="example">
    <h2>Spritemap with &lt;use> via Vue component</h2>

    <div class="example__svgs">
      <Icon name="spiriit" />
      <Icon name="vite" />
    </div>
  </div>

  <div class="example">
    <h2>Spritemap with &lt;use> written by hand (#138)</h2>

    <div class="example__svgs">
      <svg class="icon"><use xlink:href="/__spritemap#icon-vite" /></svg>
    </div>
  </div>

  <div class="example">
    <h2>Spritemap url from <code>virtual:spritemap</code> (#135)</h2>

    <div class="example__svgs">
      <svg class="icon"><use :xlink:href="viteHref" /></svg>
    </div>
  </div>

  <div class="example">
    <h2>Spritemap with &lt;img> (fragments) via Vue component</h2>

    <div class="example__svgs">
      <SpiriitView alt="" class="icon icon-spiriit" />
      <ViteView alt="" class="icon icon-vite" />
    </div>
  </div>

  <div class="example example--bg-frags">
    <h2>Spritemap with background-image (fragments)</h2>

    <div class="example__svgs">
      <span class="icon icon-spiriit icon-spiriit-frag" />
      <span class="icon icon-vite icon-vite-frag" />
    </div>
  </div>

  <div class="example example--bg-uri">
    <h2>Spritemap with background-image data uri</h2>

    <div class="example__svgs">
      <span class="icon icon-spiriit" />
      <span class="icon icon-vite" />
    </div>
  </div>

  <div class="example example--mask-uri">
    <h2>Spritemap with mask data uri</h2>

    <div class="example__svgs">
      <span class="icon icon-spiriit-mask" />
      <span class="icon icon-vite-mask" />
    </div>
  </div>
</template>
