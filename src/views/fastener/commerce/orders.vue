<!--
 * @Author: trexwb
 * @Date: 2026-09-11
 * @FilePath: /console/web/src/views/fastener/commerce/orders.vue
 * @Description: 订单管理（订阅/积分充值/知识库订单：查询 + 关闭待支付 + 退款标记）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <vab-query-form v-permissions="{ permission: ['fastenerCommerceOrders:read'] }">
      <vab-query-form-top-panel>
        <el-form :inline="true" label-width="80px" :model="queryForm" @submit.prevent>
          <el-form-item :label="translate('客户')">
            <el-input v-model.trim="queryForm.customerId" clearable :placeholder="translate('客户ID/手机号/邮箱/昵称')"
              @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('场景')">
            <el-select v-model="queryForm.scene" clearable :placeholder="translate('请选择场景')">
              <el-option :label="translate('全部')" value="" />
              <el-option :label="translate('订阅')" value="1" />
              <el-option :label="translate('积分充值')" value="2" />
              <el-option :label="translate('知识库')" value="3" />
            </el-select>
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('状态')">
            <el-select v-model="queryForm.status" clearable :placeholder="translate('请选择状态')">
              <el-option :label="translate('全部')" value="" />
              <el-option :label="translate('待支付')" value="0" />
              <el-option :label="translate('已支付')" value="1" />
              <el-option :label="translate('已关闭')" value="2" />
              <el-option :label="translate('已退款')" value="3" />
            </el-select>
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('渠道')">
            <el-select v-model="queryForm.channel" clearable :placeholder="translate('请选择渠道')">
              <el-option :label="translate('全部')" value="" />
              <el-option :label="translate('微信')" value="1" />
              <el-option :label="translate('支付宝')" value="2" />
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
          v-permissions="{ permission: ['fastenerCommerceOrders:read'] }"
          :disabled="state.selectionRows.length === 0"
          :icon="Download"
          type="primary"
          @click="handleBatchExport"
        >
          {{ translate('批量导出') }}
        </el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel>
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
        <template v-else-if="item.prop === 'scene'" #default="{ row }">
          <el-tag :type="sceneTagType(row.scene)">{{ translate(sceneText(row.scene)) }}</el-tag>
        </template>
        <template v-else-if="item.prop === 'amount'" #default="{ row }">{{ (Number(row.amount) / 100).toFixed(2) }}</template>
        <template v-else-if="item.prop === 'channel'" #default="{ row }">
          {{ Number(row.channel) === 1 ? translate('微信') : translate('支付宝') }}
        </template>
        <template v-else-if="item.prop === 'status'" #default="{ row }">
          <el-tag :type="statusTagType(row.status)">{{ translate(statusText(row.status)) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column align="center" fixed="right" :label="translate('操作')" width="120">
        <template #default="{ row }">
          <el-tooltip :content="translate('订单详情')" placement="bottom">
            <el-button v-permissions="{ permission: ['fastenerCommerceOrders:read'] }" :icon="View" text type="primary"
              @click="handleView(row)" />
          </el-tooltip>
          <el-tooltip v-if="Number(row.status) === 0" :content="translate('关闭订单')" placement="bottom">
            <el-button v-permissions="{ permission: ['fastenerCommerceOrders:write'] }" :icon="CircleClose" text
              type="warning" @click="handleCloseOrder(row)" />
          </el-tooltip>
          <el-tooltip v-if="Number(row.status) === 1" :content="translate('退款标记')" placement="bottom">
            <el-button v-permissions="{ permission: ['fastenerCommerceOrders:write'] }" :icon="RefreshLeft" text
              type="danger" @click="handleRefundOrder(row)" />
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
    <order-detail ref="viewRef" />
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { CircleClose, Download, Refresh, RefreshLeft, Search, View } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { fastenerCommerceOrderClose, fastenerCommerceOrderRefund, fastenerCommerceOrders } from '/@/api/fastenerCommerce'
import { getStorage, setStorage } from '/@/utils/storage'
import VabDraggable from 'vuedraggable'
import { ElMessage, ElMessageBox } from 'element-plus'
import OrderDetail from './vabAutoComponents/OrderDetail.vue'

const templateName = 'FastenerCommerceOrders'
defineOptions({
  name: templateName,
})

const layout = ref('sizes, prev, pager, next, jumper, total')
const viewRef = ref<any>(null)

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
  scene: '',
  status: '',
  channel: '',
  page: 1,
  pageSize: Number(getStorage('pageSize') || 20),
})

const range = ref<[string, string] | null>(null)

/* 列显示控制：与临时标准库 temp.vue 保持同一范式 */
const columns = ref<any>([
  {
    label: translate('编号'),
    prop: 'id',
    width: 80,
    disableCheck: true,
  },
  {
    label: translate('订单号'),
    prop: 'orderNo',
    width: 200,
    disableCheck: true,
  },
  {
    label: translate('客户'),
    prop: 'customer',
    width: 170,
    disableCheck: false,
  },
  {
    label: translate('场景'),
    prop: 'scene',
    width: 100,
    disableCheck: false,
  },
  {
    label: translate('金额(元)'),
    prop: 'amount',
    width: 110,
    disableCheck: false,
  },
  {
    label: translate('渠道'),
    prop: 'channel',
    width: 90,
    disableCheck: false,
  },
  {
    label: translate('状态'),
    prop: 'status',
    width: 90,
    disableCheck: false,
  },
  {
    label: translate('支付时间'),
    prop: 'paidAt',
    width: 180,
    disableCheck: false,
  },
  {
    label: translate('过期时间'),
    prop: 'timesExpire',
    width: 180,
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
const checkList = ref<any>(myCheckList[templateName] || ['id', 'orderNo', 'customer', 'scene', 'amount', 'channel', 'status', 'paidAt', 'timesExpire', 'createdAt'])
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

const sceneText = (scene: number) => ({ 1: '订阅', 2: '积分充值', 3: '知识库' } as Record<number, string>)[Number(scene)] || '-'
const sceneTagType = (scene: number) => ({ 1: 'primary', 2: 'warning', 3: 'success' } as Record<number, any>)[Number(scene)] || 'info'
const statusText = (status: number) =>
  ({ 0: '待支付', 1: '已支付', 2: '已关闭', 3: '已退款' } as Record<number, string>)[Number(status)] || '-'
const statusTagType = (status: number) =>
  ({ 0: 'info', 1: 'success', 2: 'danger', 3: 'warning' } as Record<number, any>)[Number(status)] || 'info'

const fetchData = async () => {
  try {
    if (state.loading) return
    state.loading = true
    const res: any = await fastenerCommerceOrders({
      customerId: queryForm.customerId,
      scene: queryForm.scene,
      status: queryForm.status,
      channel: queryForm.channel,
      startAt: range.value?.[0] || '',
      endAt: range.value?.[1] || '',
      page: queryForm.page,
      pageSize: queryForm.pageSize,
    })
    const payload = res?.data || {}
    rows.list = payload.data || []
    rows.total = payload.meta?.total || 0
    state.loading = false
  } catch (error) {
    state.loading = false
    console.error('Fetch orders error:', error)
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

const handleCloseOrder = (row: any) => {
  ElMessageBox.confirm(translate('仅待支付订单可关闭，确定关闭该订单吗？'), translate('提示'), {
    draggable: true,
    type: 'warning',
  })
    .then(async () => {
      state.loading = true
      await fastenerCommerceOrderClose({ orderNo: row.orderNo })
      ElMessage({ message: translate('关闭成功'), type: 'success' })
      state.loading = false
      fetchData()
    })
    .catch((err) => {
      console.log(err)
    })
}

const handleRefundOrder = (row: any) => {
  ElMessageBox.confirm(
    translate('退款标记仅更新订单状态，不自动回收已发放权益（积分/订阅时长），需人工对账后用积分调整冲正。确定标记退款吗？'),
    translate('提示'),
    { draggable: true, type: 'warning' }
  )
    .then(async () => {
      state.loading = true
      await fastenerCommerceOrderRefund({ orderNo: row.orderNo })
      ElMessage({ message: translate('标记成功'), type: 'success' })
      state.loading = false
      fetchData()
    })
    .catch((err) => {
      console.log(err)
    })
}

const handleReset = () => {
  queryForm.customerId = ''
  queryForm.scene = ''
  queryForm.status = ''
  queryForm.channel = ''
  range.value = null
  queryForm.page = 1
  queryData()
}

const init = () => {
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
