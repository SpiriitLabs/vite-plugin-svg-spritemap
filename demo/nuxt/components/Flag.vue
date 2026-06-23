<script lang="ts" setup>
import type { Flags } from '../Icons.d.ts'

const props = defineProps<{
  name: Flags
}>()

const Flag = computed(() => {
  return defineAsyncComponent(() => import(`./../../_fixtures/flags/${props.name}.svg?use`))
})
</script>

<template>
  <component :is="Flag" :class="`icon icon-${name}`">
    <slot />
  </component>
</template>
