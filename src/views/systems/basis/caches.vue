<!--
 * @Author: ${git_name}
 * @Date: 2025-04-10 16:49:45
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-04-12 09:35:39
 * @FilePath: /console/web/src/views/systems/basis/caches.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <vab-query-form v-permissions="{ permission: ['systemsCaches:read'] }">
      <vab-query-form-top-panel>

      </vab-query-form-top-panel>
      <vab-query-form-left-panel>
        <el-button v-permissions="{ permission: ['systemsCaches:delete'] }" :icon="Delete" type="danger"
          v-debounce="handleClear" :loading="state.submit">{{ translate('清空缓存') }}</el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel>

      </vab-query-form-right-panel>
    </vab-query-form>
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Delete } from '@element-plus/icons-vue'
import { cachesClear } from '/@/api/systems'
import { ElMessage, ElMessageBox } from 'element-plus'

const templateName = 'SystemsBasisCaches'
defineOptions({
  name: templateName,
})

const state = reactive({
  loading: false,
  submit: false,
})

// 批量禁用
const handleClear = () => {
  if (state.submit) return
  state.submit = true

  ElMessageBox.confirm(translate('清空缓存能让修改的信息快速生效，但是也会在短时间内拖慢系统速度，您确定要清空缓存吗？'), translate('提示'), {
    draggable: true,
    type: 'warning',
  })
    .then(async () => {
      await cachesClear()
      ElMessage({
        message: translate('清空成功'),
        type: 'success',
      })
    })
    .catch((err) => {
      console.log(err)
    })
    .finally(() => {
      state.submit = false;
    })
}
const init = () => {
  
}

/* 生命周期钩子 */
onMounted(() => { })
onBeforeUnmount(() => { /* 组件卸载前清理逻辑 */ })
onBeforeMount(() => {
  init()
})
</script>

<style lang="scss" scoped>
.is-text {
  padding: 0 !important;
  height: 12px !important;
}
</style>