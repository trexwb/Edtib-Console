<!--
 * @Author: trexwb
 * @Date: 2026-09-10
 * @FilePath: /console/web/src/views/fastener/ai/vabAutoComponents/AiSessionDetail.vue
 * @Description: AI 会话详情抽屉（会话字段 + 消息记录）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <el-drawer v-model="state.drawerFormVisible" append-to-body :before-close="handleClose" direction="rtl" size="60%"
    :title="translate('会话详情')">
    <div v-loading="state.loading" class="ai-session-detail">
      <el-descriptions border :column="2" direction="horizontal">
        <el-descriptions-item>
          <template #label>{{ translate('编号') }}</template>
          {{ session.id }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('客户') }}</template>
          {{ customerText }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('标题') }}</template>
          {{ session.title }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('模型') }}</template>
          {{ session.model }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('消息数') }}</template>
          {{ session.messageCount }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('最后消息时间') }}</template>
          {{ session.lastMessageAt }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('状态') }}</template>
          <el-tag v-if="session.status === 1" type="success">{{ translate('启用') }}</el-tag>
          <el-tag v-else type="info">{{ translate('禁用') }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('创建时间') }}</template>
          {{ session.createdAt }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('最后更新时间') }}</template>
          {{ session.updatedAt }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('消息记录数') }}</template>
          {{ total }}
        </el-descriptions-item>
      </el-descriptions>
      <el-divider content-position="left">{{ translate('消息记录') }}</el-divider>
      <el-alert v-if="state.truncated" :closable="false" show-icon
        :title="translate('消息量较大，仅展示最近 500 条')" type="warning" />
      <div v-if="messages.length" class="ai-message-list">
        <div v-for="item in messages" :key="item.id" class="ai-message">
          <div class="ai-message-header">
            <el-tag :type="roleTagType(item.role)" size="small">{{ roleText(item.role) }}</el-tag>
            <span class="ai-message-meta">#{{ item.id }}</span>
            <span class="ai-message-meta">{{ item.createdAt }}</span>
            <span class="ai-message-meta">{{ translate('Tokens') }}: {{ item.tokens || 0 }}</span>
            <span class="ai-message-meta">{{ translate('消耗积分') }}: {{ item.creditsUsed || 0 }}</span>
          </div>
          <pre class="ai-message-content">{{ item.content }}</pre>
        </div>
      </div>
      <el-empty v-else class="vab-data-empty" :description="translate('暂无数据')" />
    </div>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('关闭') }}</el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Close } from '@element-plus/icons-vue'
import { fastenerAiSessionDetail } from '/@/api/fastenerAi'

const templateName = 'AiSessionDetail'
defineOptions({
  name: templateName,
})

const session = ref<any>({})
const customer = ref<any>(null)
const messages = ref<any[]>([])
const total = ref<number>(0)

const state = reactive({
  drawerFormVisible: false,
  truncated: false,
  loading: false,
})

/* 客户可读信息：昵称/姓名 + 手机号/邮箱，兜底展示客户ID */
const customerText = computed(() => {
  const target = customer.value
  if (!target) return session.value?.customerId ?? '-'
  const name = target.nickname || target.truename || ''
  const contact = target.mobile || target.email || ''
  return `${[name, contact].filter(Boolean).join(' / ') || '-'}（#${target.id}）`
})

/* 角色映射：1 系统 / 2 用户 / 3 助手 / 4 工具 */
const roleText = (role: number) => {
  switch (Number(role)) {
    case 1:
      return translate('系统')
    case 2:
      return translate('用户')
    case 3:
      return translate('助手')
    case 4:
      return translate('工具')
    default:
      return translate('未知')
  }
}

const roleTagType = (role: number) => {
  switch (Number(role)) {
    case 2:
      return 'primary'
    case 3:
      return 'success'
    case 4:
      return 'warning'
    default:
      return 'info'
  }
}

const fetchData = async (id: number | string) => {
  const res: any = await fastenerAiSessionDetail({ id })
  return res?.data || {}
}

const showView = async (row: any = {}) => {
  if (state.loading) return
  state.loading = true
  state.truncated = false
  try {
    const data = await fetchData(row.id)
    session.value = data.session || {}
    customer.value = data.customer || null
    messages.value = data.messages || []
    total.value = data.total || messages.value.length
    state.truncated = Number(total.value) >= 500
  } catch (error) {
    console.error('Fetch session detail error:', error)
  }
  state.loading = false
  state.drawerFormVisible = true
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
.ai-session-detail {
  min-height: 200px;
}

.ai-message-list {
  margin-top: 10px;
}

.ai-message {
  padding: 10px 12px;
  margin-bottom: 10px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.ai-message-header {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.ai-message-meta {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.ai-message-content {
  margin: 8px 0 0;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
}
</style>
