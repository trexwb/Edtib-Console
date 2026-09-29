<template>
  <el-card :body-style="bodyStyle" class="vab-card" :shadow="shadow">
    <template v-if="$slots.header" #header>
      <slot name="header"></slot>
    </template>
    <el-skeleton v-if="skeleton" animated :loading="skeletonShow" :rows="skeletonRows">
      <template #default>
        <slot />
      </template>
    </el-skeleton>
    <slot v-else />
    <template v-if="$slots.footer" #footer>
      <slot name="footer"></slot>
    </template>
  </el-card>
</template>

<script lang="ts" setup>
import { ElCard } from 'element-plus'

defineOptions({
  name: 'VabCard',
})

const bodyStyle = ref<any>({})
const shadow = ref<any>('never')
const skeleton = ref<any>(false)
const skeletonRows = ref<any>(4)
      
const props = defineProps({
  ...ElCard.props,
  shadow: {
    type: String,
    default: 'never',
  },
  skeleton: {
    type: Boolean,
    default: false,
  },
  skeletonRows: {
    type: Number,
    default: 4, //显示的数量会比传入的数量多 1
  }
})

bodyStyle.value = props.bodyStyle || ''
shadow.value = props.shadow || 'never'
skeleton.value = props.skeleton || false
skeletonRows.value = props.skeletonRows || 4

const skeletonShow = ref<boolean>(true)

setTimeout(() => {
  skeletonShow.value = false
}, 500)
</script>

<style lang="scss" scoped>
.vab-card {
  :deep() {
    .el-card__header {
      font-weight: 500;

      [class*='ri-'] {
        background: linear-gradient(120deg, #bd34fe 30%, var(--el-color-primary));
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }
    }
  }
}
</style>
