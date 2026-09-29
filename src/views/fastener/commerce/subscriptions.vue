<!--
 * @Author: trexwb
 * @Date: 2026-09-11
 * @FilePath: /console/web/src/views/fastener/commerce/subscriptions.vue
 * @Description: 订阅记录管理（查询 + 详情 + 后台赠送/延长 + 取消）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <vab-query-form v-permissions="{ permission: ['fastenerCommerceSubscriptions:read'] }">
      <vab-query-form-top-panel>
        <el-form :inline="true" label-width="80px" :model="queryForm" @submit.prevent>
          <el-form-item :label="translate('客户')">
            <el-input v-model.trim="queryForm.customerId" clearable :placeholder="translate('客户ID/手机号/邮箱/昵称')"
              @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('订阅计划')">
            <el-select v-model="queryForm.planId" clearable filterable :placeholder="translate('请选择计划')">
              <el-option :label="translate('全部')" value="" />
              <el-option v-for="plan in plans" :key="plan.id" :label="plan.planName" :value="plan.id" />
            </el-select>
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('来源')">
            <el-select v-model="queryForm.source" clearable :placeholder="translate('请选择来源')">
              <el-option :label="translate('全部')" value="" />
              <el-option :label="translate('购买')" value="1" />
              <el-option :label="translate('兑换码')" value="2" />
              <el-option :label="translate('后台赠送')" value="3" />
            </el-select>
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('状态')">
            <el-select v-model="queryForm.status" clearable :placeholder="translate('请选择状态')">
              <el-option :label="translate('全部')" value="" />
              <el-option :label="translate('待生效')" value="0" />
              <el-option :label="translate('生效中')" value="1" />
              <el-option :label="translate('已过期')" value="2" />
              <el-option :label="translate('已取消')" value="3" />
            </el-select>
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('时间范围')">
            <el-date-picker v-model="range" :end-placeholder="translate('结束时间')" range-separator="-"
              :start-placeholder="translate('开始时间')" type="datetimerange" value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]" />
          </el-form-item>
          <el-form-item>
            <el-button :icon="Search" :loading="state.loading" native-type="submit" type="primary"
              @click="queryData">{{ translate('查询') }}</el-button>
            <el-button :icon="Refresh" @click="handleReset">{{ translate('重置') }}</el-button>
            <el-button class="hidden-xs-only" text type="primary" @click="handleFold">
              <span v-if="state.fold">{{ translate('展开') }}</span>
              <span v-else>{{ translate('收缩') }}</span>
              <vab-icon class="vab-dropdown" :class="{ 'vab-dropdown-active': state.fold }" icon="arrow-up-s-line" />
            </el-button>
          </el-form-item>
        </el-form>
      </vab-query-form-top-panel>
      <vab-query-form-left-panel>
        <el-button
          v-permissions="{ permission: ['fastenerCommerceSubscriptions:read'] }"
          :disabled="state.selectionRows.length === 0"
          :icon="Download"
          type="primary"
          @click="handleBatchExport"
        >
          {{ translate('批量导出') }}
        </el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel>
        <el-button v-permissions="{ permission: ['fastenerCommerceSubscriptions:write'] }" :icon="Present" type="primary"
          @click="handleGrant()">{{ translate('后台赠送订阅') }}</el-button>
        <el-button @click="fetchData">
          <vab-icon icon="refresh-line" />
        </el-button>
        <el-popover popper-class="custom-table-checkbox" trigger="hover">
          <template #reference>
            <el-button>
              <vab-icon icon="settings-line" />
            </el-button>
          </template>
          <el-checkbox-group v-model="checkList" @change="changeCheck">
            <vab-draggable item-key="element" :list="columns">
              <template #item="{ element }">
                <div>
                  <el-checkbox :checked="element.checked" :disabled="element.disableCheck" :label="element.label"
                    :value="element.prop">
                    {{ element.label }}
                  </el-checkbox>
                </div>
              </template>
            </vab-draggable>
          </el-checkbox-group>
        </el-popover>
      </vab-query-form-right-panel>
    </vab-query-form>
    <el-table v-loading="state.loading" :border="true" :data="rows.list" :stripe="true" @selection-change="setSelectRows">
      <el-table-column type="selection" width="38" />
      <el-table-column v-for="(item, index) in finallyColumns" :key="index" align="center" :label="item.label"
        :prop="item.prop" show-overflow-tooltip :width="item.width" :min-width="item.minWidth">
        <template v-if="item.prop === 'customer'" #default="{ row }">
          <div>{{ row.customer?.nickname || row.customer?.truename || '-' }}</div>
          <div style="color: var(--el-text-color-secondary); font-size: 12px">
            {{ row.customer?.mobile || row.customer?.email || '' }}
          </div>
        </template>
        <template v-else-if="item.prop === 'source'" #default="{ row }">
          <el-tag :type="sourceTagType(row.source)">{{ translate(SOURCE_MAP[Number(row.source)] || '未知') }}</el-tag>
        </template>
        <template v-else-if="item.prop === 'status'" #default="{ row }">
          <el-tag :type="statusTagType(row.displayStatus)">{{ translate(STATUS_MAP[Number(row.displayStatus)] || '未知') }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column align="center" fixed="right" :label="translate('操作')" width="160">
        <template #default="{ row }">
          <el-tooltip :content="translate('详情')" placement="bottom">
            <el-button v-permissions="{ permission: ['fastenerCommerceSubscriptions:read'] }" :icon="View" text type="primary"
              @click="handleView(row)" />
          </el-tooltip>
          <el-tooltip :content="translate('赠送/延长')" placement="bottom">
            <el-button v-permissions="{ permission: ['fastenerCommerceSubscriptions:write'] }" :icon="Present" text type="success"
              @click="handleGrant(row)" />
          </el-tooltip>
          <el-tooltip v-if="[0, 1].includes(Number(row.status))" :content="translate('取消订阅')" placement="bottom">
            <el-button v-permissions="{ permission: ['fastenerCommerceSubscriptions:write'] }" :icon="CircleClose" text type="danger"
              @click="handleCancel(row)" />
          </el-tooltip>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty class="vab-data-empty" :description="translate('暂无数据')" />
      </template>
    </el-table>
    <el-pagination v-if="rows.total > queryForm.pageSize" background :current-page="queryForm.page" :layout="layout"
      :page-size="queryForm.pageSize" :total="rows.total" @current-change="handleCurrentChange"
      @size-change="handleSizeChange" />
    <subscription-detail ref="viewRef" />
    <subscription-grant ref="grantRef" @success="fetchData" />
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { CircleClose, Download, Present, Refresh, Search, View } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import {
  fastenerCommerceSubscriptionCancel,
  fastenerCommerceSubscriptionPlans,
  fastenerCommerceSubscriptions,
} from '/@/api/fastenerCommerce'
import { getStorage, setStorage } from '/@/utils/storage'
import VabDraggable from 'vuedraggable'
import { ElMessage, ElMessageBox } from 'element-plus'
import SubscriptionDetail from './vabAutoComponents/SubscriptionDetail.vue'
import SubscriptionGrant from './vabAutoComponents/SubscriptionGrant.vue'

const templateName = 'FastenerCommerceSubscriptions'
defineOptions({
  name: templateName,
})

/* 订阅来源 / 状态映射（与后端 user_subscriptions.source / status 一致） */
const SOURCE_MAP: Record<number, string> = { 1: '购买', 2: '兑换码', 3: '后台赠送' }
const STATUS_MAP: Record<number, string> = { 0: '待生效', 1: '生效中', 2: '已过期', 3: '已取消' }

const layout = ref('sizes, prev, pager, next, jumper, total')
const viewRef = ref<any>(null)
const grantRef = ref<any>(null)

const state = reactive({
  fold: true,
  loading: false,
  selectionRows: [] as number[],
})

const setSelectRows = (selection: any) => {
  state.selectionRows = selection.map((element: any) => element.id as number)
}

// 批量导出选中项（前端生成 xlsx）
const handleBatchExport = () => {
  if (state.selectionRows.length === 0) {
    ElMessage({ message: translate('请选择需要导出的数据'), type: 'error' })
    return
  }
  const rowIds = state.selectionRows as number[]
  const exportColumns = (finallyColumns.value || []).filter((item: any) => item.prop)
  const exportData = (rows.list || [])
    .filter((item: any) => rowIds.includes(item.id))
    .map((row: any) => {
      const item: Record<string, any> = {}
      exportColumns.forEach((column: any) => {
        item[column.label] = row[column.prop] ?? ''
      })
      return item
    })
  if (exportData.length === 0) {
    ElMessage({ message: translate('暂无可导出的数据'), type: 'error' })
    return
  }
  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  XLSX.writeFile(workbook, `${translate('数据导出')}-${stamp}.xlsx`)
  ElMessage({ message: translate('导出成功'), type: 'success' })
}

/* 查询区折叠：收起时仅保留首个筛选项 */
const handleFold = () => {
  state.fold = !state.fold
}

const queryForm = reactive({
  customerId: '',
  planId: '',
  source: '',
  status: '',
  page: 1,
  pageSize: Number(getStorage('pageSize') || 20),
})

const range = ref<[string, string] | null>(null)
const plans = ref<any[]>([])

/* 列显示控制：与临时标准库 temp.vue 保持同一范式 */
const columns = ref<any>([
  {
    label: translate('编号'),
    prop: 'id',
    width: 80,
    disableCheck: true,
  },
  {
    label: translate('客户'),
    prop: 'customer',
    width: 170,
    disableCheck: true,
  },
  {
    label: translate('订阅计划'),
    prop: 'planName',
    minWidth: 160,
    disableCheck: false,
  },
  {
    label: translate('来源'),
    prop: 'source',
    width: 110,
    disableCheck: false,
  },
  {
    label: translate('订单号'),
    prop: 'orderNo',
    width: 200,
    disableCheck: false,
  },
  {
    label: translate('开始时间'),
    prop: 'startAt',
    width: 180,
    disableCheck: false,
  },
  {
    label: translate('到期时间'),
    prop: 'endAt',
    width: 180,
    disableCheck: false,
  },
  {
    label: translate('剩余天数'),
    prop: 'daysLeft',
    width: 100,
    disableCheck: false,
  },
  {
    label: translate('状态'),
    prop: 'status',
    width: 100,
    disableCheck: false,
  },
  {
    label: translate('创建时间'),
    prop: 'createdAt',
    width: 180,
    disableCheck: false,
  },
])
// 恢复用户拖拽后的列顺序（与显隐配置同存于 checkList storage 的 `${templateName}Order` 键）
const cachedColumnOrder = (getStorage('checkList') || {})[`${templateName}Order`]
if (Array.isArray(cachedColumnOrder) && cachedColumnOrder.length) {
  columns.value.sort((a: any, b: any) => {
    const ai = cachedColumnOrder.indexOf(a.prop || a.key)
    const bi = cachedColumnOrder.indexOf(b.prop || b.key)
    return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi)
  })
}
const myCheckList = getStorage('checkList') || {}
const checkList = ref<any>(myCheckList[templateName] || ['id', 'customer', 'planName', 'source', 'orderNo', 'startAt', 'endAt', 'daysLeft', 'status', 'createdAt'])
const finallyColumns = computed(() => {
  return columns.value.filter((item: any) => checkList.value.includes(item.prop))
})

const changeCheck = () => {
  const savedCheckList = getStorage('checkList') || {}
  savedCheckList[templateName] = JSON.parse(JSON.stringify(checkList.value))
  savedCheckList[`${templateName}Order`] = columns.value.map((item: any) => item.prop || item.key)
  setStorage('checkList', savedCheckList)
}
const rows = reactive({
  total: 0,
  list: [] as any[],
})

const sourceTagType = (source: number) => ({ 1: 'primary', 2: 'warning', 3: 'success' } as Record<number, any>)[Number(source)] || 'info'
const statusTagType = (status: number) =>
  ({ 0: 'warning', 1: 'success', 2: 'info', 3: 'danger' } as Record<number, any>)[Number(status)] || 'info'

const fetchPlans = async () => {
  try {
    const res: any = await fastenerCommerceSubscriptionPlans({ page: 1, pageSize: 200 })
    plans.value = (res?.data?.data || []).map((row: any) => ({
      id: row.id,
      planName: `${row.plan_name || '-'}${Number(row.status) === 1 ? '' : '（停用）'}`,
    }))
  } catch (error) {
    console.error('Fetch subscription plans error:', error)
  }
}

const fetchData = async () => {
  try {
    if (state.loading) return
    state.loading = true
    const res: any = await fastenerCommerceSubscriptions({
      customerId: queryForm.customerId,
      planId: queryForm.planId,
      source: queryForm.source,
      status: queryForm.status,
      startAt: range.value?.[0] || '',
      endAt: range.value?.[1] || '',
      page: queryForm.page,
      pageSize: queryForm.pageSize,
    })
    const payload = res?.data || {}
    // 后端字段为下划线风格（plan_name / days_left / display_status），统一映射为表格展示字段
    rows.list = (payload.data || []).map((row: any) => ({
      ...row,
      planName: row.plan_name || row.planName || '-',
      daysLeft: row.days_left ?? row.daysLeft ?? 0,
      displayStatus: row.display_status ?? row.displayStatus ?? row.status,
    }))
    rows.total = payload.meta?.total || 0
    state.loading = false
  } catch (error) {
    state.loading = false
    console.error('Fetch subscriptions error:', error)
  }
}

const handleCurrentChange = (value: number) => {
  queryForm.page = value
  fetchData()
}

const handleSizeChange = (value: number) => {
  queryForm.page = 1
  queryForm.pageSize = value
  setStorage('pageSize', queryForm.pageSize)
  fetchData()
}

const queryData = () => {
  queryForm.page = 1
  fetchData()
}

const handleView = (row: any = {}) => {
  viewRef.value.showView(row)
}

const handleGrant = (row: any = null) => {
  grantRef.value.showGrant(row)
}

const handleCancel = (row: any) => {
  ElMessageBox.confirm(
    translate('取消仅更新订阅状态（已取消），不回收已发放的订阅权益与赠送积分，需人工对账后用积分调整冲正。确定取消吗？'),
    translate('提示'),
    { draggable: true, type: 'warning' }
  )
    .then(async () => {
      state.loading = true
      await fastenerCommerceSubscriptionCancel({ id: row.id })
      ElMessage({ message: translate('取消成功'), type: 'success' })
      state.loading = false
      fetchData()
    })
    .catch((err) => {
      console.log(err)
    })
}

const handleReset = () => {
  queryForm.customerId = ''
  queryForm.planId = ''
  queryForm.source = ''
  queryForm.status = ''
  range.value = null
  queryForm.page = 1
  queryData()
}

const init = () => {
  fetchPlans()
  fetchData()
}

/* 生命周期钩子 */
onMounted(() => { /* 组件挂载后逻辑 */ })
onBeforeUnmount(() => { /* 组件卸载前清理逻辑 */ })
onBeforeMount(() => {
  init()
})
</script>

<style lang="scss" scoped></style>
