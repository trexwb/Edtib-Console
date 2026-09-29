<!--
 * @Author: ${git_name}
 * @Date: 2025-04-16 11:51:19
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-06-16 14:33:18
 * @FilePath: /console/web/src/views/settings/update.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <h1>{{ translate('当前版本') }}: {{ appVersion }}</h1>
    <div class="demo-progress" v-show="isUpdateAvailable">
      <el-progress :text-inside="true" :stroke-width="24" :percentage="downloadProgress" status="success" striped
        striped-flow />
    </div>
    <el-button v-show="!isUpdateAvailable" v-loading="isCheckLoading" type="primary"
      @click="checkUpdate">{{ translate('检查更新') }}</el-button>
    <el-text v-show="!isUpdateAvailable && isCheckUpdate && !isCheckLoading" class="mx-1"
      type="success">{{ translate('目前已经是最新版本，不用更新') }}</el-text>
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
const templateName = 'SettingsCache'
defineOptions({
  name: templateName,
})

const appVersion = ref('');
const isCheckUpdate = ref(false);
const isCheckLoading = ref(false);
const isUpdateAvailable = ref(false);
const downloadProgress = ref(0);

const handleUpdateAvailable = () => {
  // console.log('handleUpdateAvailable');
  isUpdateAvailable.value = true;
  isCheckLoading.value = false;
};
const handleUpdateNotAvailable = () => {
  // console.log('handleUpdateNotAvailable');
  isUpdateAvailable.value = false;
  isCheckLoading.value = false;
};
const handleDownloadProgress = (percent: number) => {
  // console.log('handleDownloadProgress', percent);
  downloadProgress.value = Number(Number(percent || downloadProgress.value++).toFixed(1));
};
const handleUpdateDownloaded = () => {
  // console.log('handleUpdateDownloaded');
  isUpdateAvailable.value = false;
  // 自定义重启
  // window.electronAPI.restartApp(); // 假设你已经定义了一个重启方法
};
const checkUpdate = async () => {
  isCheckUpdate.value = true;
  isCheckLoading.value = true;
  await window.electronAPI.checkUpdate();
}

onMounted(async () => {
  appVersion.value = await window.electronAPI.getAppVersion();
  window.electronAPI.onUpdateAvailable(handleUpdateAvailable);
  window.electronAPI.onUpdateNotAvailable(handleUpdateNotAvailable);
  window.electronAPI.onDownloadProgress(handleDownloadProgress);
  window.electronAPI.onUpdateDownloaded(handleUpdateDownloaded);
})
</script>

<style lang="scss" scoped>
.is-text {
  padding: 0 !important;
  height: 12px !important;
}

.demo-progress .el-progress--line {
  width: 100%;
  margin-bottom: 15px;
}
</style>
