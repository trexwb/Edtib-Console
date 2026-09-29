<template>
  <div :id="config.id"></div>
</template>

<script lang="ts" setup>
import Player from 'xgplayer'
import 'xgplayer/dist/index.min.css'
import HlsPlayer from 'xgplayer-hls.js'

defineOptions({
  name: 'VabPlayerHls',
})

const props = defineProps({
  config: {
    type: Object,
    default() {
      return {
        id: 'mse',
        url: '',
      }
    },
  },
})

const player = ref<any>(null)

const emit = defineEmits(['player'])

const init = () => {
  if (props.config.url && props.config.url !== '') {
    player.value = new Player({
      plugins: [HlsPlayer],
      ...props.config,
    })
    emit('player', player.value)
  }
}

watch(
  props.config,
  () => {
    init()
  },
  { deep: true }
)

onMounted(() => {
  init()
})

onBeforeMount(() => {
  player.value && typeof player.value.destroy === 'function' && player.value.destroy()
})
</script>
