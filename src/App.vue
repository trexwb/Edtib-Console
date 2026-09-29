<!--
 * @Author: trexwb
 * @Date: 2024-04-17 11:45:08
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-07-23 16:25:33
 * @FilePath: /console/web/src/App.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <vab-app />
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { useSettingsStore } from '/@/store/modules/settings'
import { getStorage } from '/@/utils/storage'
import Watermark from '/@/utils/watermark'

defineOptions({
  name: 'App',
})

const $baseNotify = inject<any>('$baseNotify')
const settingsStore = useSettingsStore()
const { updateTheme, changeColor, handleLock } = settingsStore

// const { title } = storeToRefs(settingsStore)
// Watermark.set(title.value);
Watermark.set(translate('杭州仟标科技(edtib.com)'));

const isBackground = ref(false)
const lockTime = 15 * 60 // 秒为单位
let lockTimer: any = null
const startLockTimer = () => {
  if (import.meta.env.VITE_USER_NODE_ENV === 'development') console.log('startLockTimer: ', isBackground.value, new Date())
  const loginFormData = getStorage('loginFormData') || {}
  if (isBackground.value && loginFormData['username']) {
    lockTimer = setTimeout(() => {
      handleLock()
    }, lockTime * 1000)
  }
}
const endLockTimer = () => {
  if (import.meta.env.VITE_USER_NODE_ENV === 'development') console.log('endLockTimer: ', isBackground.value, new Date())
  if (!isBackground.value) {
    lockTimer && clearTimeout(lockTimer)
  }
}
// 定义处理 visibilitychange 事件的函数
const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    // 页面进入后台
    isBackground.value = true
    startLockTimer()
  } else {
    // 页面回到前台
    isBackground.value = false
    endLockTimer()
  }
};

onBeforeMount(() => {
  changeColor()
  updateTheme()
})

// 在组件挂载时添加事件监听器
onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

// 在组件卸载前移除事件监听器
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<style lang="scss">
.el-table__fixed,
.el-table__fixed-right {
  z-index: 1 !important;
}

.el-table__body-wrapper {
  overflow: auto;
}

.el-tabs--top .el-tabs__nav,
.el-tabs--bottom .el-tabs__nav {
  height: 100% !important;
}

.no-text .el-checkbox__label {
  display: none !important;
  color: transparent !important;
}

/* 全站操作列 text 按钮统一压缩（shapes/standards/materials/categories 等列表页共享） */
.is-text {
  padding: 0 !important;
  height: 12px !important;
}
</style>