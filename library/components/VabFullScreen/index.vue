<template>
  <vab-icon class="vab-full-screen" :icon="isFullscreen ? 'fullscreen-exit-fill' : 'fullscreen-fill'" @click="toggle" />
</template>

<script lang="ts" setup>
defineOptions({
  name: 'VabFullScreen',
})

const { isFullscreen, toggle } = useFullscreen()
</script>
