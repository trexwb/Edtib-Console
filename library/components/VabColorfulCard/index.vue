<template>
  <el-card
    :body-style="bodyStyle"
    class="vab-colorful-card"
    :shadow="shadow"
    :style="
      style
        ? style
        : {
            background: `linear-gradient(120deg, ${colorFrom} 10%, ${colorTo})`,
          }
    "
  >
    <template v-if="$slots.header" #header>
      <slot name="header"></slot>
    </template>
    <vab-icon v-if="icon" :icon="icon" />
    <slot />
  </el-card>
</template>

<script lang="ts" setup>
import { ElCard } from 'element-plus'

defineOptions({
  name: 'VabColorfulCard',
})

const bodyStyle = ref<any>({})
const shadow = ref<any>('never')
const colorFrom = ref<any>('')
const colorTo = ref<any>('')
const title = ref<any>('')
const icon = ref<any>('')
const style = ref<any>({})

const props = defineProps({
  ...ElCard.props,
  shadow: {
    type: String,
    default: 'never',
  },
  colorFrom: {
    type: String,
    default: '',
  },
  colorTo: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  style: {
    type: Object,
    default: () => {},
  },
})

bodyStyle.value = props.bodyStyle || {}
shadow.value = props.shadow || 'never'
colorFrom.value = props.colorFrom || ''
colorTo.value = props.colorTo || ''
colorTo.value = props.colorTo || ''
title.value = props.title || ''
icon.value = props.icon || ''
style.value = props.style || {}

</script>

<style lang="scss" scoped>
.vab-colorful-card {
  position: relative;
  min-height: 120px;
  cursor: pointer;

  * {
    color: var(--el-color-white);
  }

  :deep() {
    .el-card__header {
      color: var(--el-color-white);
    }
  }

  i {
    position: absolute;
    right: 20px;
    font-size: 60px;
    transform: rotate(15deg);
  }
}
</style>
