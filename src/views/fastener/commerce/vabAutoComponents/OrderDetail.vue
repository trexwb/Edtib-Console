<!--
 * @Author: trexwb
 * @Date: 2026-09-11
 * @FilePath: /console/web/src/views/fastener/commerce/vabAutoComponents/OrderDetail.vue
 * @Description: 订单详情抽屉（订单字段 + 扩展信息）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <el-drawer v-model="state.drawerFormVisible" append-to-body :before-close="handleClose" direction="rtl" size="50%"
    :title="translate('订单详情')">
    <div class="order-detail">
      <el-descriptions border :column="2" direction="horizontal">
        <el-descriptions-item>
          <template #label>{{ translate('编号') }}</template>
          {{ order.id }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('订单号') }}</template>
          {{ order.orderNo }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('客户') }}</template>
          {{ customerText }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('场景') }}</template>
          {{ translate(sceneText) }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('金额(元)') }}</template>
          {{ (Number(order.amount || 0) / 100).toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('渠道') }}</template>
          {{ Number(order.channel) === 1 ? translate('微信') : translate('支付宝') }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('状态') }}</template>
          <el-tag :type="statusTagType">{{ translate(statusText) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('支付时间') }}</template>
          {{ order.paidAt || '-' }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('过期时间') }}</template>
          {{ order.timesExpire || '-' }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('创建时间') }}</template>
          {{ order.createdAt }}
        </el-descriptions-item>
      </el-descriptions>
      <template v-if="extensionText">
        <el-divider content-position="left">{{ translate('扩展信息') }}</el-divider>
        <pre class="order-extension">{{ extensionText }}</pre>
      </template>
    </div>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('关闭') }}</el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Close } from '@element-plus/icons-vue'

const templateName = 'FastenerCommerceOrderDetail'
defineOptions({
  name: templateName,
})

const order = ref<any>({})

const state = reactive({
  drawerFormVisible: false,
})

const sceneText = computed(() => ({ 1: '订阅', 2: '积分充值', 3: '知识库' } as Record<number, string>)[Number(order.value.scene)] || '-')
const statusText = computed(() =>
  ({ 0: '待支付', 1: '已支付', 2: '已关闭', 3: '已退款' } as Record<number, string>)[Number(order.value.status)] || '-')
const statusTagType = computed(() =>
  ({ 0: 'info', 1: 'success', 2: 'danger', 3: 'warning' } as Record<number, any>)[Number(order.value.status)] || 'info')

/* 客户可读信息：昵称/姓名 + 手机号/邮箱，兜底展示客户ID */
const customerText = computed(() => {
  const customer = order.value?.customer
  if (!customer) return order.value?.customerId ?? '-'
  const name = customer.nickname || customer.truename || ''
  const contact = customer.mobile || customer.email || ''
  return `${[name, contact].filter(Boolean).join(' / ') || '-'}（#${customer.id}）`
})

/* extension 为 JSON（plan_name / credits / qr_content 等），二维码内容脱敏展示 */
const extensionText = computed(() => {
  const extension = order.value?.extension
  if (!extension) return ''
  const clone = typeof extension === 'object' ? { ...extension } : extension
  if (clone && typeof clone === 'object' && 'qr_content' in clone) {
    clone.qr_content = String(clone.qr_content || '').slice(0, 24) + '...'
  }
  return typeof clone === 'string' ? clone : JSON.stringify(clone, null, 2)
})

const showView = (row: any = {}) => {
  order.value = row || {}
  state.drawerFormVisible = true
}

const handleClose = () => {
  state.drawerFormVisible = false
}

defineExpose({ showView })

/* 生命周期钩子 */
onMounted(() => { /* 组件挂载后逻辑 */ })
onBeforeUnmount(() => { /* 组件卸载前清理逻辑 */ })
</script>

<style lang="scss" scoped>
.order-extension {
  padding: 10px;
  margin: 0;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}
</style>
