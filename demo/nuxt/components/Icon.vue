<script lang="ts" setup>
import type { Icons } from '../Icons.d.ts'

const props = defineProps<{
  name: Icons
}>()

const Icon = computed(() => {
  return defineAsyncComponent(() => import(`./../../_fixtures/icons/${props.name}.svg?use`))
})
</script>

<template>
  <component :is="Icon" :class="`icon icon-${name}`">
    <slot />
  </component>
</template>
