<!--
 * @Author: trexwb
 * @Date: 2026-09-10
 * @FilePath: /console/web/src/views/fastener/ai/vabAutoComponents/AiToolCallDetail.vue
 * @Description: 工具调用详情抽屉（入参 / 结果全量查看与复制）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <el-drawer v-model="state.drawerFormVisible" append-to-body :before-close="handleClose" direction="rtl" size="60%"
    :title="translate('工具调用详情')">
    <div v-loading="state.loading" class="ai-tool-call-detail">
      <el-descriptions border :column="2" direction="horizontal">
        <el-descriptions-item>
          <template #label>{{ translate('编号') }}</template>
          {{ detail.id }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('客户') }}</template>
          {{ customerText }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('会话ID') }}</template>
          {{ detail.sessionId }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('工具') }}</template>
          {{ detail.tool }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('需人工确认') }}</template>
          <el-tag v-if="detail.needConfirm === 1" type="warning">{{ translate('是') }}</el-tag>
          <el-tag v-else type="info">{{ translate('否') }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('状态') }}</template>
          <el-tag v-if="detail.status === 1" type="success">{{ translate('成功') }}</el-tag>
          <el-tag v-else type="danger">{{ translate('失败') }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('创建时间') }}</template>
          {{ detail.createdAt }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('用户确认') }}</template>
          <el-tag v-if="detail.confirmed === 1" type="success">{{ translate('已确认') }}</el-tag>
          <el-tag v-else type="info">{{ translate('未确认') }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <template v-for="block in blocks" :key="block.key">
        <el-divider content-position="left">
          {{ block.label }}
          <el-button :icon="DocumentCopy" link type="primary" @click="handleCopy(block)">
            {{ translate('复制') }}
          </el-button>
        </el-divider>
        <pre class="ai-json-block">{{ block.text }}</pre>
      </template>
    </div>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('关闭') }}</el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Close, DocumentCopy } from '@element-plus/icons-vue'
import { fastenerAiToolCallDetail } from '/@/api/fastenerAi'
import handleClipboard from '/@/utils/clipboard'

const templateName = 'AiToolCallDetail'
defineOptions({
  name: templateName,
})

const detail = ref<any>({})
const customer = ref<any>(null)
const blocks = ref<any[]>([])

const state = reactive({
  drawerFormVisible: false,
  loading: false,
})

/* 客户可读信息：昵称/姓名 + 手机号/邮箱，兜底展示客户ID */
const customerText = computed(() => {
  const target = customer.value
  if (!target) return detail.value?.customerId ?? '-'
  const name = target.nickname || target.truename || ''
  const contact = target.mobile || target.email || ''
  return `${[name, contact].filter(Boolean).join(' / ') || '-'}（#${target.id}）`
})

/* 统一格式化 JSON，解析失败时原样展示 */
const formatJson = (value: any) => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const fetchData = async (id: number | string) => {
  const res: any = await fastenerAiToolCallDetail({ id })
  return res?.data || {}
}

const showView = async (row: any = {}) => {
  if (state.loading) return
  state.loading = true
  try {
    const data = await fetchData(row.id)
    detail.value = data.data || data || {}
    customer.value = data.customer || null
    blocks.value = [
      { key: 'params', label: translate('入参'), text: formatJson(detail.value.params) },
      { key: 'result', label: translate('返回结果'), text: formatJson(detail.value.result) },
    ]
  } catch (error) {
    console.error('Fetch tool call detail error:', error)
  }
  state.loading = false
  state.drawerFormVisible = true
}

const handleCopy = (block: any = {}) => {
  handleClipboard(block.text)
}

const open = () => {
  state.drawerFormVisible = true
}

const close = () => {
  state.drawerFormVisible = false
}

const handleClose = () => {
  close()
}

defineExpose({ showView, open, close })

/* 生命周期钩子 */
onMounted(() => { /* 组件挂载后逻辑 */ })
onBeforeUnmount(() => { /* 组件卸载前清理逻辑 */ })
</script>

<style lang="scss" scoped>
.ai-tool-call-detail {
  min-height: 200px;
}

.ai-json-block {
  max-height: 320px;
  padding: 10px 12px;
  overflow: auto;
  font-family: Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}
</style>
