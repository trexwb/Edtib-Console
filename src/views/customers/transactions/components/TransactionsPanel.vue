<!--
 * @Author: trexwb
 * @Date: 2026-09-14
 * @FilePath: /client/console/web/src/views/customers/transactions/components/TransactionsPanel.vue
 * @Description: 交易记录面板（个人 / 企业共用同一实现，状态按 scope 完全独立，避免 Tab 串数据）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <vab-query-form v-permissions="{ permission: [currentPermission] }">
      <vab-query-form-top-panel>
        <el-form :inline="true" label-width="90px" :model="queryForm" @submit.prevent>
          <el-form-item label="ID" label-width="40px">
            <el-input v-model.trim="queryForm.filter.id" clearable :placeholder="translate('请输入ID搜索')" @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="ownerLabel">
            <el-input v-model.trim="queryForm.filter.ownerId" clearable :placeholder="ownerPlaceholder" @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('序列号ID')">
            <el-input
              v-model.trim="queryForm.filter.serialId"
              clearable
              :placeholder="translate('请输入序列号ID搜索')"
              @keyup.enter="queryData"
            />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('类型')" label-width="60px" style="width: 240px">
            <el-select v-model="queryForm.filter.type" clearable :placeholder="translate('请选择类型')">
              <el-option :label="translate('全部')" value="" />
              <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('创建时间')" label-width="80px">
            <el-date-picker
              v-model="queryForm.filter.createdRange"
              clearable
              :end-placeholder="translate('结束时间')"
              :start-placeholder="translate('开始时间')"
              type="datetimerange"
              value-format="YYYY-MM-DD HH:mm:ss"
            />
          </el-form-item>
          <el-form-item>
            <el-button :icon="Search" :loading="state.loading" native-type="submit" type="primary" @click="queryData">
              {{ translate('查询') }}
            </el-button>
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
        <el-button :disabled="state.selectionRows.length === 0" :icon="Download" type="primary" @click="handleBatchExport">
          {{ translate('批量导出') }}
        </el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel>
        <el-button @click="queryData">
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
                  <el-checkbox :checked="element.checked" :disabled="element.disableCheck" :label="element.label" :value="element.prop">
                    {{ element.label }}
                  </el-checkbox>
                </div>
              </template>
            </vab-draggable>
          </el-checkbox-group>
        </el-popover>
      </vab-query-form-right-panel>
    </vab-query-form>
    <el-table ref="tableSortRef" v-loading="state.loading" :border="true" :data="rows.list" :stripe="true" @sort-change="handleSortChange"
      @selection-change="setSelectRows">
      <el-table-column type="selection" width="38" />
      <el-table-column
        v-for="(item, index) in finallyColumns"
        :key="index"
        align="center"
        :fixed="item.fixed"
        :label="item.label"
        :prop="item.prop"
        show-overflow-tooltip
        :sortable="item.sortable"
        :width="item.width"
      >
        <template #default="{ row }">
          <template v-if="item.prop === 'type'">
            <el-tag :type="typeMap[row.type]?.tagType || 'info'">
              {{ typeMap[row.type]?.label || `${translate('类型')} ${row.type}` }}
            </el-tag>
          </template>
          <template v-else-if="item.prop === 'owner'">
            <el-text class="mx-1">{{ ownerText(row) }}</el-text>
          </template>
          <template v-else-if="item.prop === 'serialCode'">
            <el-text class="mx-1" type="primary">{{ maskCode(row.serial?.code) }}</el-text>
          </template>
          <template v-else-if="item.prop === 'serialBatch'">
            <el-text class="mx-1">{{ row.serial?.batch || '-' }}</el-text>
          </template>
          <template v-else-if="item.prop === 'levelChange'">
            <el-text class="mx-1">{{ row.origLevel }} → {{ row.finalLevel }}</el-text>
          </template>
          <template v-else-if="item.prop === 'timesExpireChange'">
            <el-text class="mx-1">{{ formatDateTime(row.origTimesExpire) }} → {{ formatDateTime(row.finalTimesExpire) }}</el-text>
          </template>
          <template v-else-if="item.prop === 'creditChange'">
            <el-text class="mx-1" type="primary">{{ row.origCredit }} → {{ row.finalCredit }}</el-text>
          </template>
          <template v-else-if="item.prop === 'createdAt'">
            {{ formatDateTime(row.createdAt) }}
          </template>
          <template v-else-if="item.prop === 'updatedAt'">
            {{ formatDateTime(row.updatedAt) }}
          </template>
          <template v-else-if="item.prop === 'operation'">
            <el-button v-permissions="{ permission: [currentPermission] }" :icon="View" link type="primary" @click="handleDetail(row)">
              {{ translate('详情') }}
            </el-button>
          </template>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty class="vab-data-empty" :description="translate('暂无数据')" />
      </template>
    </el-table>
    <el-pagination
      v-if="rows.total > queryForm.pageSize"
      background
      :current-page="queryForm.page"
      :layout="layout"
      :page-size="queryForm.pageSize"
      :total="rows.total"
      @current-change="handleCurrentChange"
      @size-change="handleSizeChange"
    />
    <el-drawer v-model="state.detailVisible" size="620px" :title="translate('交易详情')">
      <div v-loading="state.detailLoading">
        <el-descriptions border :column="1">
          <el-descriptions-item :label="translate('编号')">{{ state.detail.id }}</el-descriptions-item>
          <el-descriptions-item :label="ownerLabel">{{ ownerText(state.detail) }}</el-descriptions-item>
          <el-descriptions-item :label="translate('类型')">
            <el-tag :type="typeMap[state.detail.type]?.tagType || 'info'">
              {{ typeMap[state.detail.type]?.label || `${translate('类型')} ${state.detail.type}` }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item :label="translate('等级变化')">
            {{ state.detail.origLevel }} → {{ state.detail.finalLevel }}
          </el-descriptions-item>
          <el-descriptions-item :label="translate('有效期变化')">
            {{ formatDateTime(state.detail.origTimesExpire) }} → {{ formatDateTime(state.detail.finalTimesExpire) }}
          </el-descriptions-item>
          <el-descriptions-item :label="translate('积分变化')">
            {{ state.detail.origCredit }} → {{ state.detail.finalCredit }}
          </el-descriptions-item>
          <el-descriptions-item :label="translate('序列号')">{{ maskCode(state.detail.serial?.code) }}</el-descriptions-item>
          <el-descriptions-item :label="translate('批次')">{{ state.detail.serial?.batch || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="translate('创建时间')">{{ formatDateTime(state.detail.createdAt) }}</el-descriptions-item>
          <el-descriptions-item :label="translate('最后更新时间')">{{ formatDateTime(state.detail.updatedAt) }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import VabDraggable from 'vuedraggable'
import { Download, Refresh, Search, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import {
  usersTransactionsList,
  usersTransactionsDetail,
  organizationsTransactionsList,
  organizationsTransactionsDetail,
} from '/@/api/customers'
import { getStorage, setStorage } from '/@/utils/storage'

const props = defineProps<{
  /** users=个人交易 / organizations=企业交易 */
  scope: 'users' | 'organizations'
}>()

defineOptions({
  name: 'TransactionsPanel',
})

const layout = ref('sizes, prev, pager, next, jumper, total')
const tableSortRef = ref<any>(null)

// 列显隐配置持久化 key 按 scope 隔离，避免个人 / 企业两侧串数据
const templateName = computed(() => (props.scope === 'users' ? 'CustomersTransactionsUsers' : 'CustomersTransactionsOrganizations'))

const currentPermission = computed(() =>
  props.scope === 'users' ? 'customersUsersTransactions:read' : 'customersOrganizationsTransactions:read'
)

const ownerLabel = computed(() => (props.scope === 'users' ? translate('用户') : translate('企业名称')))
const ownerPlaceholder = computed(() => (props.scope === 'users' ? translate('请输入用户ID搜索') : translate('请输入企业ID搜索')))

// 交易类型：0续期 1升级 2降级 3积分充值 4积分消费 5积分赠送 6积分扣除 7积分冻结 8积分解冻
type TagType = 'success' | 'primary' | 'warning' | 'info' | 'danger'
const typeMap = computed<Record<number, { label: string; tagType: TagType }>>(() => ({
  0: { label: translate('续期'), tagType: 'info' },
  1: { label: translate('升级'), tagType: 'success' },
  2: { label: translate('降级'), tagType: 'warning' },
  3: { label: translate('积分充值'), tagType: 'success' },
  4: { label: translate('积分消费'), tagType: 'warning' },
  5: { label: translate('积分赠送'), tagType: 'success' },
  6: { label: translate('积分扣除'), tagType: 'danger' },
  7: { label: translate('积分冻结'), tagType: 'info' },
  8: { label: translate('积分解冻'), tagType: 'success' },
}))

const typeOptions = computed(() =>
  Object.keys(typeMap.value).map((key: string) => ({ value: Number(key), label: typeMap.value[Number(key)].label }))
)

const DEFAULT_CHECK = ['id', 'owner', 'type', 'levelChange', 'creditChange', 'createdAt', 'operation']

const state = reactive({
  fold: true,
  loading: false,
  detailVisible: false,
  detailLoading: false,
  detail: {} as any,
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

const queryForm = reactive({
  filter: {
    id: '',
    ownerId: '',
    serialId: '',
    type: '',
    createdRange: [] as string[],
  },
  page: 1,
  pageSize: Number(getStorage('pageSize') || 20),
  sort: '-id',
})

const rows = reactive({
  total: 0,
  list: [] as any[],
})

const columns = ref<any[]>([])
const checkList = ref<string[]>([])

const finallyColumns = computed(() => {
  return columns.value.filter((item: any) => checkList.value.includes(item.prop))
})

const buildColumns = () => {
  const tabColumns = [
    {
      label: translate('编号'),
      prop: 'id',
      width: 80,
      sortable: true,
      disableCheck: false,
    },
    {
      label: ownerLabel.value,
      prop: 'owner',
      width: 180,
      sortable: false,
      disableCheck: false,
    },
    {
      label: translate('类型'),
      prop: 'type',
      width: 110,
      sortable: true,
      disableCheck: false,
    },
    {
      label: translate('等级变化'),
      prop: 'levelChange',
      width: 130,
      sortable: false,
      disableCheck: false,
    },
    {
      label: translate('有效期变化'),
      prop: 'timesExpireChange',
      width: 300,
      sortable: false,
      disableCheck: false,
    },
    {
      label: translate('积分变化'),
      prop: 'creditChange',
      width: 140,
      sortable: false,
      disableCheck: false,
    },
    {
      label: translate('序列号'),
      prop: 'serialCode',
      width: 180,
      sortable: false,
      disableCheck: false,
    },
    {
      label: translate('批次'),
      prop: 'serialBatch',
      width: 150,
      sortable: false,
      disableCheck: false,
    },
    {
      label: translate('创建时间'),
      prop: 'createdAt',
      width: 180,
      sortable: true,
      disableCheck: false,
    },
    {
      label: translate('最后更新时间'),
      prop: 'updatedAt',
      width: 180,
      sortable: true,
      disableCheck: false,
    },
    {
      label: translate('操作'),
      prop: 'operation',
      width: 90,
      sortable: false,
      fixed: 'right',
      disableCheck: true,
    },
  ]
  // 恢复用户拖拽后的列顺序（与显隐配置同存于 checkList storage 的 `${templateName}Order` 键）
  const savedCheckList = getStorage('checkList') || {}
  const cachedColumnOrder = savedCheckList[`${templateName.value}Order`]
  if (Array.isArray(cachedColumnOrder) && cachedColumnOrder.length) {
    tabColumns.sort((a: any, b: any) => {
      const ai = cachedColumnOrder.indexOf(a.prop)
      const bi = cachedColumnOrder.indexOf(b.prop)
      return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi)
    })
  }
  columns.value = tabColumns
  checkList.value = savedCheckList[templateName.value] || [...DEFAULT_CHECK]
}

const changeCheck = () => {
  const savedCheckList = getStorage('checkList') || {}
  savedCheckList[templateName.value] = JSON.parse(JSON.stringify(checkList.value))
  savedCheckList[`${templateName.value}Order`] = columns.value.map((item: any) => item.prop)
  setStorage('checkList', savedCheckList)
}

const ownerText = (row: any) => {
  if (!row) return '-'
  if (props.scope === 'users') {
    const nickname = row.user?.nickname || '-'
    const id = row.user?.id ?? row.userId ?? ''
    return id === '' || id === null ? nickname : `${nickname}（ID:${id}）`
  }
  const companyName = row.organization?.companyName || '-'
  const id = row.organization?.id ?? row.organizationId ?? ''
  return id === '' || id === null ? companyName : `${companyName}（ID:${id}）`
}

const maskCode = (code: any) => {
  if (!code) return '-'
  return String(code).replace(/-(\w)(\w{3})(\w)/g, '-$1***$3')
}

const formatDateTime = (value: any) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const buildFilter = () => {
  const filter: Record<string, any> = {}
  if (queryForm.filter.id !== '' && queryForm.filter.id !== null) filter.id = Number(queryForm.filter.id)
  if (queryForm.filter.ownerId !== '' && queryForm.filter.ownerId !== null) {
    if (props.scope === 'users') filter.userId = Number(queryForm.filter.ownerId)
    else filter.organizationId = Number(queryForm.filter.ownerId)
  }
  if (queryForm.filter.serialId !== '' && queryForm.filter.serialId !== null) filter.serialId = Number(queryForm.filter.serialId)
  if (queryForm.filter.type !== '' && queryForm.filter.type !== null) filter.type = Number(queryForm.filter.type)
  const range = queryForm.filter.createdRange || []
  if (range.length === 2) {
    filter.createdStart = range[0]
    filter.createdEnd = range[1]
  }
  return filter
}

const handleFold = () => {
  state.fold = !state.fold
}

const handleSortChange = (column: any) => {
  queryForm.sort = `${column.order === 'descending' ? '-' : '+'}${column.prop}`
  fetchData()
}

const fetchData = async () => {
  try {
    if (state.loading) return
    state.loading = true
    const api = props.scope === 'users' ? usersTransactionsList : organizationsTransactionsList
    const { data }: any = await api({
      filter: buildFilter(),
      sort: queryForm.sort,
      page: queryForm.page,
      pageSize: queryForm.pageSize,
    })
    rows.list = data?.list || []
    rows.total = data?.total || 0
  } catch (error) {
    console.error('Fetch data error:', error)
  } finally {
    state.loading = false
  }
}

const handleDetail = async (row: any) => {
  state.detail = { ...row }
  state.detailVisible = true
  try {
    state.detailLoading = true
    const api = props.scope === 'users' ? usersTransactionsDetail : organizationsTransactionsDetail
    const { data }: any = await api({ id: row.id })
    if (data) state.detail = { ...row, ...data }
  } catch (error) {
    console.error('Fetch detail error:', error)
  } finally {
    state.detailLoading = false
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

// 重置查询条件
const handleReset = () => {
  queryForm.filter.id = ''
  queryForm.filter.ownerId = ''
  queryForm.filter.serialId = ''
  queryForm.filter.type = ''
  queryForm.filter.createdRange = []
  queryForm.sort = '-id'
  queryForm.page = 1
}

/* 生命周期钩子 */
onMounted(() => {})
onBeforeMount(() => {
  buildColumns()
  fetchData()
})
</script>

<style lang="scss" scoped>
.is-text {
  padding: 0 !important;
  height: 12px !important;
}
</style>
