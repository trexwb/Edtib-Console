<!--
 * @Author: trexwb
 * @Date: 2025-03-11 15:44:15
 * @LastEditors: trexwb
 * @LastEditTime: 2025-03-24 16:51:36
 * @FilePath: /client/console/library/components/VabFooter/index.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <footer v-if="theme.showFooter" class="vab-footer">
    Copyright
    <vab-icon icon="copyright-line" />
    {{ fullYear }} {{ title }}
  </footer>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '/@/store/modules/settings'

defineOptions({
  name: 'VabFooter',
})

const fullYear = new Date().getFullYear()
const settingsStore = useSettingsStore()
const { title, theme } = storeToRefs(settingsStore)
</script>

<style lang="scss" scoped>
.vab-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--el-footer-height);
  padding: 0 var(--el-padding) 0 var(--el-padding);
  margin-top: var(--el-margin);
  color: var(--el-color-grey);
  background: var(--el-color-white);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);

  i {
    margin: 0 3px;
  }
}
</style>
