<!--
 * @Author: trexwb
 * @Date: 2025-03-11 15:44:15
 * @LastEditors: trexwb
 * @LastEditTime: 2025-04-07 15:16:55
 * @FilePath: /client/console/web/library/components/VabRightTools/index.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div class="vab-right-tools">
    <vab-search v-show="!isHorizontal" class="hidden-xs-only" />
    <vab-dark v-show="theme.showDark" :style="!isHorizontal ? '' : { marginLeft: 'var(--el-margin)' }" />
    <vab-color-picker v-show="theme.showColorPicker" />
    <vab-theme v-show="theme.showTheme && routeName !== 'SeparateLayout'" />
    <vab-error-log v-show="currentEnv === 'development'" class="hidden-xs-only" />
    <vab-lock v-show="theme.showLock" />
    <vab-notice v-show="theme.showNotice" />
    <vab-language v-show="theme.showLanguage" />
    <vab-full-screen v-show="theme.showFullScreen" />
    <vab-refresh v-show="theme.showRefresh" />
    <vab-avatar />
  </div>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '/@/store/modules/settings'

defineOptions({
  name: 'VabRightTools',
})

const currentEnv = import.meta.env.VITE_USER_NODE_ENV || 'production'

defineProps({
  isHorizontal: {
    type: Boolean,
    default: false,
  },
})
const route = useRoute()
const settingsStore = useSettingsStore()
const { theme } = storeToRefs(settingsStore)
const routeName = ref<any>(route.name)
watch(
  route,
  () => {
    routeName.value = route.name
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.vab-right-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
</style>
