<!--
 * @Author: trexwb
 * @Date: 2026-09-11
 * @FilePath: /console/web/src/views/fastener/commerce/vabAutoComponents/SubscriptionDetail.vue
 * @Description: 订阅记录详情抽屉（记录 + 计划 + 客户基础信息 + 关联订阅订单）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <el-drawer v-model="state.drawerFormVisible" append-to-body :before-close="handleClose" direction="rtl" size="55%"
    :title="translate('订阅详情')">
    <div v-loading="state.loading" class="subscription-detail">
      <el-descriptions border :column="2" direction="horizontal">
        <el-descriptions-item>
          <template #label>{{ translate('编号') }}</template>
          {{ detail.id || '-' }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('客户ID') }}</template>
          {{ detail.customerId || '-' }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('客户') }}</template>
          {{ customerText }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('订阅计划') }}</template>
          {{ planText }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('来源') }}</template>
          <el-tag :type="sourceTagType">{{ translate(SOURCE_MAP[Number(detail.source)] || '未知') }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('订单号') }}</template>
          {{ detail.orderNo || '-' }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('开始时间') }}</template>
          {{ detail.startAt || '-' }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('到期时间') }}</template>
          {{ detail.endAt || '-' }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('剩余天数') }}</template>
          {{ state.daysLeft }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('状态') }}</template>
          <el-tag :type="statusTagType">{{ translate(STATUS_MAP[Number(displayStatus)] || '未知') }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('创建时间') }}</template>
          {{ detail.createdAt || '-' }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('更新时间') }}</template>
          {{ detail.updatedAt || '-' }}
        </el-descriptions-item>
      </el-descriptions>
      <template v-if="plan">
        <el-divider content-position="left">{{ translate('计划信息') }}</el-divider>
        <el-descriptions border :column="2" direction="horizontal">
          <el-descriptions-item>
            <template #label>{{ translate('计划名称') }}</template>
            {{ plan.name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item>
            <template #label>{{ translate('计划价格(元)') }}</template>
            {{ (Number(plan.price || 0) / 100).toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item>
            <template #label>{{ translate('时长(天)') }}</template>
            {{ plan.duration_days ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item>
            <template #label>{{ translate('赠送积分') }}</template>
            {{ plan.gift_credits ?? 0 }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
      <el-divider content-position="left">{{ translate('关联订阅订单') }}</el-divider>
      <el-table :border="true" :data="orders" :stripe="true" max-height="320">
        <el-table-column align="center" :label="translate('订单号')" prop="orderNo" show-overflow-tooltip min-width="180" />
        <el-table-column align="center" :label="translate('金额(元)')" show-overflow-tooltip width="110">
          <template #default="{ row }">
            {{ (Number(row.amount || 0) / 100).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column align="center" :label="translate('状态')" show-overflow-tooltip width="100">
          <template #default="{ row }">
            <el-tag :type="orderStatusTagType(row.status)">{{ translate(ORDER_STATUS_MAP[Number(row.status)] || '未知') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column align="center" :label="translate('支付时间')" prop="paidAt" show-overflow-tooltip width="180" />
        <el-table-column align="center" :label="translate('创建时间')" prop="createdAt" show-overflow-tooltip width="180" />
        <template #empty>
          <el-empty class="vab-data-empty" :description="translate('暂无关联订单（如后台赠送）')" />
        </template>
      </el-table>
    </div>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('关闭') }}</el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Close } from '@element-plus/icons-vue'
import { fastenerCommerceSubscriptionDetail } from '/@/api/fastenerCommerce'

const templateName = 'FastenerCommerceSubscriptionDetail'
defineOptions({
  name: templateName,
})

const SOURCE_MAP: Record<number, string> = { 1: '购买', 2: '兑换码', 3: '后台赠送' }
const STATUS_MAP: Record<number, string> = { 0: '待生效', 1: '生效中', 2: '已过期', 3: '已取消' }
const ORDER_STATUS_MAP: Record<number, string> = { 0: '待支付', 1: '已支付', 2: '已关闭', 3: '已退款' }

const detail = ref<any>({})
const plan = ref<any>(null)
const customer = ref<any>(null)
const orders = ref<any[]>([])

const state = reactive({
  drawerFormVisible: false,
  loading: false,
  daysLeft: 0,
})

/** 展示态：status=1 但已过期按已过期呈现（与列表口径一致） */
const displayStatus = computed(() => {
  const status = Number(detail.value.status)
  if (status === 1 && detail.value.endAt && new Date(detail.value.endAt).getTime() <= Date.now()) return 2
  return status
})

const sourceTagType = computed(() => ({ 1: 'primary', 2: 'warning', 3: 'success' } as Record<number, any>)[Number(detail.value.source)] || 'info')
const statusTagType = computed(() => ({ 0: 'warning', 1: 'success', 2: 'info', 3: 'danger' } as Record<number, any>)[displayStatus.value] || 'info')
const orderStatusTagType = (status: number) => ({ 0: 'info', 1: 'success', 2: 'danger', 3: 'warning' } as Record<number, any>)[Number(status)] || 'info'

const customerText = computed(() => {
  if (!customer.value) return '-'
  const name = customer.value.nickname || customer.value.truename || ''
  const contact = customer.value.mobile || customer.value.email || ''
  return [name, contact].filter(Boolean).join(' / ') || `#${customer.value.id}`
})

const planText = computed(() => {
  if (plan.value?.name) return plan.value.name
  const matched = Number(detail.value.planId)
  return matched ? `#${matched}` : '-'
})

const fetchDetail = async (id: number) => {
  try {
    state.loading = true
    const res: any = await fastenerCommerceSubscriptionDetail({ id })
    const payload = res?.data || {}
    detail.value = payload.data || {}
    plan.value = payload.plan || null
    customer.value = payload.customer || null
    orders.value = payload.orders || []
    state.daysLeft = payload.days_left ?? 0
    state.loading = false
  } catch (error) {
    state.loading = false
    console.error('Fetch subscription detail error:', error)
  }
}

const showView = (row: any = {}) => {
  detail.value = row || {}
  plan.value = null
  customer.value = null
  orders.value = []
  state.daysLeft = row?.daysLeft ?? row?.days_left ?? 0
  state.drawerFormVisible = true
  if (row?.id) fetchDetail(Number(row.id))
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
.subscription-detail {
  min-height: 200px;
}
</style>
