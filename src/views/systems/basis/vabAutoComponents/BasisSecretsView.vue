<!--
 * @Author: trexwb
 * @Date: 2025-03-25 16:43:18
 * @LastEditors: trexwb
 * @LastEditTime: 2025-04-01 17:17:02
 * @FilePath: /client/console/src/views/systems/basis/vabAutoComponents/BasisSecretsView.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-drawer v-model="state.drawerdFormVisible" append-to-body :before-close="handleClose" direction="rtl" size="50%"
    :title="translate('详情')">
    <el-descriptions border :column="2" direction="horizontal">
      <el-descriptions-item>
        <template #label>{{ translate('有效期') }}</template>
        {{ viewForm.times_expire }}
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('名称') }}</template>
        {{ viewForm.title }}
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>AppId</template>
        <el-text v-if="!state.viewAppId" class="mx-1">
          {{ `${viewForm.app_id.slice(0, 4)}********${viewForm.app_id.slice(12)}` }}
        </el-text>
        <el-text v-else class="mx-1">{{ viewForm.app_id }}</el-text>
        <el-icon @click="toggleSecret('viewAppId')">
          <View v-if="!state.viewAppId" />
          <Hide v-else />
        </el-icon>
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>AppSecret</template>
        <el-text v-if="!state.viewAppSecret" class="mx-1">
          {{ `${viewForm.app_secret.slice(0, 12)}********${viewForm.app_secret.slice(20)}` }}
        </el-text>
        <el-text v-else class="mx-1">{{ viewForm.app_secret }}</el-text>
        <el-icon @click="toggleSecret('viewAppSecret')">
          <View v-if="!state.viewAppSecret" />
          <Hide v-else />
        </el-icon>
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>AppIv</template>
        <el-text v-if="!state.viewAppIv" class="mx-1">
          {{ `${viewForm.app_iv.slice(0, 4)}********${viewForm.app_iv.slice(12)}` }}
        </el-text>
        <el-text v-else class="mx-1">{{ viewForm.app_iv }}</el-text>
        <el-icon @click="toggleSecret('viewAppIv')">
          <View v-if="!state.viewAppIv" />
          <Hide v-else />
        </el-icon>
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('启用') }}</template>
        {{ viewForm.status == '1' ? translate('是') : translate('否') }}
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('权限') }}</template>
        {{ viewForm.permissions.join(' ') }}
      </el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('关闭') }}</el-button>
      <el-button v-permissions="{ permission: ['systemsServers:write'] }" :icon="Edit" type="success"
        @click="handleEdit">
        {{ translate('修改') }}
      </el-button>
      <el-button v-permissions="{ permission: ['systemsServers:delete'] }" :icon="Delete" type="danger"
        @click="handleDelete">
        {{ translate('删除') }}
      </el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Close, Edit, Delete, View, Hide } from '@element-plus/icons-vue'
import { secretsDetail } from '/@/api/systems'

/* 组件模板名称 */
const templateName = 'SystemsBasisSecretsView'

/* 定义组件选项 */
defineOptions({
  name: templateName, // 注册组件名称，用于调试和keep-alive缓存标识
})

/* 编辑器相关引用 */
// VMdEditor.use(githubTheme)
const viewForm = ref<any>({})

/* 事件和全局方法 */
const emit = defineEmits(['handle-edit', 'handle-delete']) // 定义组件事件

/* 核心响应式状态 */
const state = reactive<any>({
  drawerdFormVisible: false, // 表单抽屉可见状态
  loading: false,
  viewAppId: false,
  viewAppSecret: false,
  viewAppIv: false
})

/* C-C1: 查看密钥的自动回隐定时器，避免明文长时间驻留页面 */
let secretTimer: any = null
const clearSecretTimer = () => {
  if (secretTimer) {
    clearTimeout(secretTimer)
    secretTimer = null
  }
}
/**
 * 切换密钥明文展示（默认打码，点击后展示 10 秒自动回隐）
 * @param {string} key - state 中对应的展示开关键名
 */
const toggleSecret = (key: 'viewAppId' | 'viewAppSecret' | 'viewAppIv') => {
  const willShow = !state[key]
  clearSecretTimer()
  // 先关闭其它两项，避免同时多段明文暴露
  state.viewAppId = false
  state.viewAppSecret = false
  state.viewAppIv = false
  state[key] = willShow
  if (willShow) {
    secretTimer = setTimeout(() => {
      state[key] = false
    }, 10000)
  }
}

/**
 * 获取文章详情数据
 * @param {number} id - 文章ID
 * @returns {Promise<object>} 文章详情数据
 */
const fetchData = async (id: any) => {
  if (state.loading) return
  state.loading = true
  const { data } = await secretsDetail({ id: id || 0 })
  state.loading = false
  return data
}

/**
 * 显示编辑对话框核心逻辑
 * @param {object|null} row - 行数据对象（null时为新建模式）
 * @description 处理新建/编辑模式初始化逻辑，包含草稿加载功能
 */
const showView = async (row: any) => {
  viewForm.value = await fetchData(row.id)
  open()
}

// 暴露组件方法
defineExpose({ showView })

// 对话框控制方法
const open = () => { state.drawerdFormVisible = true }
const close = async () => { state.drawerdFormVisible = false }

const handleClose = () => {
  clearSecretTimer()
  close()
}

const handleEdit = () => {
  clearSecretTimer()
  close()
  emit('handle-edit', viewForm.value)
}

const handleDelete = () => {
  clearSecretTimer()
  close()
  emit('handle-delete', viewForm.value)
}

/* 生命周期钩子 */
onMounted(() => { /* 组件挂载后逻辑 */ })
onBeforeUnmount(() => {
  clearSecretTimer()
})
</script>

<style lang="scss" scoped></style>
