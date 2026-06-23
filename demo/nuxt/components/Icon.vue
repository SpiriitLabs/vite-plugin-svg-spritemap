<script lang="ts" setup>
import type { UiIcons } from '../Icons.d.ts'

const props = defineProps<{
  name: UiIcons
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
