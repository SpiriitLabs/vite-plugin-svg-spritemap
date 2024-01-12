<script setup lang="ts">
import SpiriitView from './../../_fixtures/icons/spiriit.svg?view'
import SpiriitUse from './../../_fixtures/icons/spiriit.svg?use'
import ViteView from './../../_fixtures/icons/vite.svg?view'
import ViteUse from './../../_fixtures/icons/vite.svg?use'
</script>

<template>
  <h1>Vite Plugin SVG Spritemap Demo with VueJS</h1>

  <p>This is a demo of the Vite Plugin SVG Spritemap working with VueJS component.</p>

  <div class="example">
    <h2>Spritemap with &lt;use> via Vue component</h2>

    <div class="example__svgs">
      <SpiriitUse class="icon icon-spiriit">
        <title>My superb logo</title>
      </SpiriitUse>
      <ViteUse class="icon icon-vite" />
    </div>
  </div>

  <div class="example">
    <h2>Spritemap with &lt;img> (fragments) via Vue component</h2>

    <div class="example__svgs">
      <SpiriitView alt="" class="icon icon-spiriit" />
      <ViteView alt="" class="icon icon-vite" />
    </div>
  </div>
</template>
