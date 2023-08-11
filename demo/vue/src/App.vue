<script setup lang="ts">
import SpiriitView from './icons/spiriit.svg?view'
import SpiriitUse from './icons/spiriit.svg?use'
import ViteView from './icons/vite.svg?view'
import ViteUse from './icons/vite.svg?use'
</script>

<template>
  <h1>Vite Plugin SVG Spritemap Demo with VueJS</h1>

  <p>This is a demo of the Vite Plugin SVG Spritemap working with VueJS component.</p>

  <div class="example">
    <h2>Spritemap with &lt;use> via Vue component</h2>

    <div class="example__svgs">
      <SpiriitUse>
        <title>My superb logo</title>
      </SpiriitUse>
      <ViteUse />
    </div>
  </div>

  <div class="example">
    <h2>Spritemap with &lt;img> (fragments) via Vue component</h2>

    <div class="example__svgs">
      <SpiriitView />
      <ViteView />
    </div>
  </div>
</template>
