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
    <el-button v-show="updateReady" v-loading="installing" type="success"
      @click="installUpdate">{{ translate('重启并安装') }}</el-button>
    <el-text v-show="!isUpdateAvailable && isCheckUpdate && !isCheckLoading" class="mx-1"
      type="success">{{ translate('目前已经是最新版本，不用更新') }}</el-text>
  </div>
</template>

<script lang="ts" setup>
// [迁移调整] 版本/更新相关调用统一走 src/bridge 桥接层（Tauri invoke），
// 不再直接访问 window.electronAPI（浏览器宿主下该对象不存在，老代码会在 onMounted 抛错）
import { ElMessage } from 'element-plus'
import { bridge } from '/@/bridge'
import { translate } from '/@/i18n'
const templateName = 'SettingsCache'
defineOptions({
  name: templateName,
})

const appVersion = ref('');
const isCheckUpdate = ref(false);
const isCheckLoading = ref(false);
const isUpdateAvailable = ref(false);
const updateReady = ref(false);
const installing = ref(false);
const downloadProgress = ref(0);

const disposers: Array<() => void> = [];

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
const handleDownloadProgress = (_event: unknown, payload: any) => {
  // Rust 侧 emit 的是 { percent, transferred, total } 对象，直接当数字使用会得到 NaN
  downloadProgress.value = Number(Number(payload?.percent ?? 0).toFixed(1));
};
const handleUpdateDownloaded = () => {
  // console.log('handleUpdateDownloaded');
  isUpdateAvailable.value = false;
  downloadProgress.value = 100;
  updateReady.value = true;
};
const checkUpdate = async () => {
  isCheckUpdate.value = true;
  isCheckLoading.value = true;
  updateReady.value = false;
  downloadProgress.value = 0;
  await bridge.checkUpdate();
}
const installUpdate = async () => {
  installing.value = true;
  try {
    // 安装 check_update 已下载的更新包（Rust confirm_update → Update::install），完成后重启生效
    await bridge.confirmUpdate();
    bridge.restartApp();
  } catch (error: any) {
    installing.value = false;
    ElMessage({ message: error?.message ?? String(error), type: 'error' });
  }
};

onMounted(async () => {
  appVersion.value = await bridge.getAppVersion();
  disposers.push(
    bridge.onUpdateAvailable(handleUpdateAvailable),
    bridge.onUpdateNotAvailable(handleUpdateNotAvailable),
    bridge.onDownloadProgress(handleDownloadProgress),
    bridge.onUpdateDownloaded(handleUpdateDownloaded)
  );
});

onBeforeUnmount(() => {
  // 注销事件监听，避免页面反复进出后同一事件触发多次回调
  disposers.splice(0).forEach((dispose) => dispose());
});
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
