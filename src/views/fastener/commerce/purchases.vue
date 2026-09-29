<!--
 * @Author: trexwb
 * @Date: 2026-09-11
 * @FilePath: /console/web/src/views/fastener/commerce/purchases.vue
 * @Description: 标准购买记录管理（积分单购记录：快照版本 vs 当前版本对比）
 *               积分购买的标准不随更新同步，仅订阅用户享有当年更新
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <el-alert class="purchase-guide" :closable="false" show-icon
      :title="translate('积分购买的标准固化购买时版本快照，不随标准更新同步；订阅用户可获取全部标准及当年更新')" type="info" />
    <vab-query-form v-permissions="{ permission: ['fastenerCommercePurchases:read'] }">
      <vab-query-form-top-panel>
        <el-form :inline="true" label-width="80px" :model="queryForm" @submit.prevent>
          <el-form-item :label="translate('客户')">
            <el-input v-model.trim="queryForm.customerId" clearable :placeholder="translate('客户ID/手机号/邮箱/昵称')"
              @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('标准体系')">
            <el-select v-model="queryForm.sourceType" clearable :placeholder="translate('请选择标准体系')">
              <el-option :label="translate('全部')" value="" />
              <el-option :label="translate('产品标准')" value="1" />
              <el-option :label="translate('材料标准')" value="2" />
              <el-option :label="translate('性能标准')" value="3" />
              <el-option :label="translate('表面标准')" value="4" />
            </el-select>
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('主体ID')">
            <el-input v-model.trim="queryForm.sourceId" clearable :placeholder="translate('请输入标准主体ID')"
              @keyup.enter="queryData" />
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
          v-permissions="{ permission: ['fastenerCommercePurchases:read'] }"
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
        <template v-else-if="item.prop === 'standardType'" #default="{ row }">
          <el-tag>{{ translate(typeName(Number(row.standardType))) }}</el-tag>
        </template>
        <template v-else-if="item.prop === 'productName'" #default="{ row }">{{ snapshotName(row) }}</template>
        <template v-else-if="item.prop === 'version'" #default="{ row }">{{ row.version || '-' }}</template>
        <template v-else-if="item.prop === 'currentVersion'" #default="{ row }">
          <el-tooltip v-if="hasUpdate(row)" :content="translate('标准已有更新，积分购买不自动同步，订阅可获取最新')"
            placement="top">
            <el-tag type="warning">{{ row.currentVersion }}</el-tag>
          </el-tooltip>
          <template v-else>
            {{ row.currentVersion || '-' }}
          </template>
        </template>
        <template v-else-if="item.prop === 'source'" #default="{ row }">
          {{ Number(row.source) === 1 ? translate('积分购买') : translate('后台赠送') }}
        </template>
      </el-table-column>
      <template #empty>
        <el-empty class="vab-data-empty" :description="translate('暂无数据')" />
      </template>
    </el-table>
    <el-pagination v-if="rows.total > queryForm.pageSize" background :current-page="queryForm.page" :layout="layout"
      :page-size="queryForm.pageSize" :total="rows.total" @current-change="handleCurrentChange"
      @size-change="handleSizeChange" />
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Download, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { fastenerCommercePurchases } from '/@/api/fastenerCommerce'
import { getStorage, setStorage } from '/@/utils/storage'
import VabDraggable from 'vuedraggable'

const templateName = 'FastenerCommercePurchases'
defineOptions({
  name: templateName,
})

const layout = ref('sizes, prev, pager, next, jumper, total')

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
  sourceType: '',
  sourceId: '',
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
    label: translate('标准体系'),
    prop: 'standardType',
    width: 110,
    disableCheck: false,
  },
  {
    label: translate('主体ID'),
    prop: 'targetId',
    width: 90,
    disableCheck: false,
  },
  {
    label: translate('标准编码'),
    prop: 'productCode',
    minWidth: 160,
    disableCheck: false,
  },
  {
    label: translate('标准名称'),
    prop: 'productName',
    minWidth: 160,
    disableCheck: false,
  },
  {
    label: translate('消耗积分'),
    prop: 'priceCredit',
    width: 100,
    disableCheck: false,
  },
  {
    label: translate('购买版本'),
    prop: 'version',
    width: 100,
    disableCheck: false,
  },
  {
    label: translate('当前版本'),
    prop: 'currentVersion',
    width: 100,
    disableCheck: false,
  },
  {
    label: translate('购买来源'),
    prop: 'source',
    width: 100,
    disableCheck: false,
  },
  {
    label: translate('购买时间'),
    prop: 'purchasedAt',
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
const checkList = ref<any>(myCheckList[templateName] || ['id', 'customer', 'standardType', 'targetId', 'productCode', 'productName', 'priceCredit', 'version', 'currentVersion', 'source', 'purchasedAt'])
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

const typeName = (code: number) =>
  ({ 1: '产品标准', 2: '材料标准', 3: '性能标准', 4: '表面标准' } as Record<number, string>)[code] || '-'

const snapshotName = (row: any) => {
  const snapshot = row?.snapshot
  if (snapshot && typeof snapshot === 'object') {
    const name = snapshot.name || snapshot.code
    if (name) return String(name)
  }
  return row?.productCode || '-'
}

const hasUpdate = (row: any) => {
  const current = String(row?.currentVersion || '')
  const bought = String(row?.version || '')
  return !!current && !!bought && current !== bought
}

const fetchData = async () => {
  try {
    if (state.loading) return
    state.loading = true
    const res: any = await fastenerCommercePurchases({
      customerId: queryForm.customerId,
      sourceType: queryForm.sourceType,
      sourceId: queryForm.sourceId,
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
    console.error('Fetch purchases error:', error)
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

const handleReset = () => {
  queryForm.customerId = ''
  queryForm.sourceType = ''
  queryForm.sourceId = ''
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
.purchase-guide {
  margin-bottom: 20px;
}
</style>
