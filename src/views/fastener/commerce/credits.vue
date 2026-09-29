<!--
 * @Author: trexwb
 * @Date: 2026-09-11
 * @FilePath: /console/web/src/views/fastener/commerce/credits.vue
 * @Description: 积分流水管理（人工调整入口，走钱包唯一入口，流水 source=admin）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <vab-query-form v-permissions="{ permission: ['fastenerCommerceCredits:read'] }">
      <vab-query-form-top-panel>
        <el-form :inline="true" label-width="80px" :model="queryForm" @submit.prevent>
          <el-form-item :label="translate('客户')">
            <el-input v-model.trim="queryForm.customerId" clearable :placeholder="translate('客户ID/手机号/邮箱/昵称')"
              @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('来源')">
            <el-select v-model="queryForm.source" clearable :placeholder="translate('请选择来源')">
              <el-option v-for="(label, key) in SOURCE_MAP" :key="key" :label="translate(label)" :value="key" />
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
          v-permissions="{ permission: ['fastenerCommerceCredits:read'] }"
          :disabled="state.selectionRows.length === 0"
          :icon="Download"
          type="primary"
          @click="handleBatchExport"
        >
          {{ translate('批量导出') }}
        </el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel>
        <el-button v-permissions="{ permission: ['fastenerCommerceCredits:write'] }" :icon="Coin" type="primary"
          @click="handleAdjust">{{ translate('人工积分调整') }}</el-button>
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
        <template v-else-if="item.prop === 'delta'" #default="{ row }">
          <span :class="Number(row.delta) > 0 ? 'credit-plus' : 'credit-minus'">
            {{ Number(row.delta) > 0 ? `+${row.delta}` : row.delta }}
          </span>
        </template>
        <template v-else-if="item.prop === 'source'" #default="{ row }">
          <el-tag :type="sourceTagType(row.source)">{{ translate(SOURCE_MAP[row.source] || row.source) }}</el-tag>
        </template>
        <template v-else-if="item.prop === 'remark'" #default="{ row }">{{ remarkText(row.remark) }}</template>
      </el-table-column>
      <template #empty>
        <el-empty class="vab-data-empty" :description="translate('暂无数据')" />
      </template>
    </el-table>
    <el-pagination v-if="rows.total > queryForm.pageSize" background :current-page="queryForm.page" :layout="layout"
      :page-size="queryForm.pageSize" :total="rows.total" @current-change="handleCurrentChange"
      @size-change="handleSizeChange" />
    <credits-adjust ref="adjustRef" @success="fetchData" />
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Coin, Download, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { fastenerCommerceCreditsTransactions } from '/@/api/fastenerCommerce'
import { getStorage, setStorage } from '/@/utils/storage'
import VabDraggable from 'vuedraggable'
import CreditsAdjust from './vabAutoComponents/CreditsAdjust.vue'

const templateName = 'FastenerCommerceCredits'
defineOptions({
  name: templateName,
})

const layout = ref('sizes, prev, pager, next, jumper, total')
const adjustRef = ref<any>(null)

/* 流水来源映射（与后端 credit_transactions.source 一致） */
const SOURCE_MAP: Record<string, string> = {
  wallet_init: '钱包初始化',
  subscribe_gift: '订阅赠送',
  purchase: '充值入账',
  consume: '消费扣减',
  refund: '退款',
  redeem: '兑换码',
  admin: '人工调整',
}

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
  source: '',
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
    label: translate('客户'),
    prop: 'customer',
    width: 170,
    disableCheck: true,
  },
  {
    label: translate('变动积分'),
    prop: 'delta',
    width: 110,
    disableCheck: false,
  },
  {
    label: translate('变动后余额'),
    prop: 'balanceAfter',
    width: 110,
    disableCheck: false,
  },
  {
    label: translate('来源'),
    prop: 'source',
    width: 140,
    disableCheck: false,
  },
  {
    label: translate('关联单号'),
    prop: 'refNo',
    width: 180,
    disableCheck: false,
  },
  {
    label: translate('备注'),
    prop: 'remark',
    minWidth: 180,
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
const checkList = ref<any>(myCheckList[templateName] || ['id', 'customer', 'delta', 'balanceAfter', 'source', 'refNo', 'remark', 'createdAt'])
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

const sourceTagType = (source: string) => {
  if (['purchase', 'subscribe_gift', 'redeem', 'wallet_init'].includes(source)) return 'success'
  if (source === 'admin') return 'warning'
  return 'info'
}

const remarkText = (remark: any) => {
  if (!remark) return ''
  if (typeof remark === 'string') return remark
  return remark.remark || remark.desc || JSON.stringify(remark)
}

const fetchData = async () => {
  try {
    if (state.loading) return
    state.loading = true
    const res: any = await fastenerCommerceCreditsTransactions({
      customerId: queryForm.customerId,
      source: queryForm.source,
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
    console.error('Fetch credits transactions error:', error)
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

const handleAdjust = () => {
  adjustRef.value.showEdit(queryForm.customerId)
}

const handleReset = () => {
  queryForm.customerId = ''
  queryForm.source = ''
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

<style lang="scss" scoped>
.credit-plus {
  color: var(--el-color-success);
  font-weight: 600;
}

.credit-minus {
  color: var(--el-color-danger);
  font-weight: 600;
}
</style>
