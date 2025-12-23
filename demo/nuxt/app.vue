<script setup lang="ts">
import SpiriitView from './../_fixtures/icons/spiriit.svg?view'
import ViteView from './../_fixtures/icons/vite.svg?view'
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
