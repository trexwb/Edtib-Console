<!--
 * @Author: trexwb
 * @Date: 2025-03-25 11:42:30
 * @LastEditors: trexwb
 * @LastEditTime: 2025-11-18 17:20:19
 * @FilePath: /client/console/web/src/views/customers/discounts/serials.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div class="comprehensive-table-container table-auto-height" v-loading="state.downloading">
    <vab-query-form v-permissions="{ permission: ['customersSerials:read'] }">
      <vab-query-form-top-panel>
        <el-form :inline="true" label-width="80px" :model="queryForm" @submit.prevent>
          <el-form-item :label="translate('模糊搜索')">
            <el-input v-model="queryForm.filter.keywords" clearable :placeholder="translate('请输入关键字模糊搜索')" @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" label="ID" label-width="40px">
            <el-input v-model.trim="queryForm.filter.id" clearable :placeholder="translate('请输入ID搜索')" @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('批次号')" label-width="70px">
            <el-input v-model.trim="queryForm.filter.batch" clearable :placeholder="translate('请输入批次号搜索')" @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('序列号')" label-width="70px">
            <el-input v-model.trim="queryForm.filter.code" clearable :placeholder="translate('请输入序列号搜索')" @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('类型')" label-width="60px" style="width: 240px">
            <el-select v-model="queryForm.filter.type" clearable :placeholder="translate('请选择类型')">
              <el-option :label="translate('全部')" value="" />
              <el-option :label="translate('续期')" :value="0" />
              <el-option :label="translate('积分')" :value="1" />
              <el-option :label="translate('升级')" :value="2" />
              <el-option :label="translate('设备')" :value="3" />
              <el-option :label="translate('综合')" :value="4" />
            </el-select>
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('状态')" label-width="60px" style="width: 240px">
            <el-select v-model="queryForm.filter.status" clearable :placeholder="translate('请选择状态')">
              <el-option :label="translate('全部')" value="" />
              <el-option :label="translate('待售不可用')" :value="0" />
              <el-option :label="translate('已售正常可用')" :value="1" />
              <el-option :label="translate('已用不可用')" :value="2" />
              <el-option :label="translate('回收禁用')" value="3" />
            </el-select>
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
        <el-button v-permissions="{ permission: ['customersSerials:write'] }"
          :disabled="state.selectionRows.length === 0" :icon="Edit" type="danger"
          @click="handleStatus(null)">{{ translate('修改选中') }}</el-button>
        <el-button v-permissions="{ permission: ['customersSerials:read'] }"
          :disabled="state.selectionRows.length === 0" :icon="ArrowDown" type="primary"
          @click="handleDownload(null)">{{ translate('下载选中') }}</el-button>
        <el-button v-permissions="{ permission: ['customersSerials:read'] }" :icon="Download" type="success"
          @click="handleDownloadAll()">{{ translate('下载全部') }}</el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel>
        <el-button v-permissions="{ permission: ['customersSerials:write'] }" :icon="Plus" type="primary"
          @click="handleEdit(null)">{{ translate('添加') }}</el-button>
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
    <el-table ref="tableSortRef" v-loading="state.loading" :border="true" :data="rows.list" :stripe="true"
      @selection-change="setSelectRows" @sort-change="handleSortChange">
      <el-table-column type="selection" width="38" />
      <el-table-column v-for="(item, index) in finallyColumns" :key="index" align="center" :label="item.label"
        :prop="item.prop" show-overflow-tooltip :sortable="item.sortable" :width="item.width">
        <template #default="{ row }">
          <template v-if="item.prop === 'code'">
            <el-text class="mx-1" type="primary">
              {{ row.code.replace(/-(\w)(\w{3})(\w)/g, '-$1***$3') }}
            </el-text>
          </template>
          <template v-if="item.prop === 'type'">
            <el-tag v-if="row.type === 0" type="info">{{ translate('续期') }}</el-tag>
            <el-tag v-if="row.type === 1" type="info">{{ translate('积分') }}</el-tag>
            <el-tag v-if="row.type === 2" type="info">{{ translate('升级') }}</el-tag>
            <el-tag v-if="row.type === 3" type="info">{{ translate('设备') }}</el-tag>
            <el-tag v-if="row.type === 4" type="info">{{ translate('综合') }}</el-tag>
          </template>
          <template v-if="item.prop === 'status'">
            <el-tag v-if="row.status === 0" type="info">{{ translate('待售不可用') }}</el-tag>
            <el-tag v-if="row.status === 1" type="success">{{ translate('已售正常可用') }}</el-tag>
            <el-tag v-if="row.status === 2" type="warning">{{ translate('已用不可用') }}</el-tag>
            <el-tag v-if="row.status === 3" type="danger">{{ translate('回收禁用') }}</el-tag>
          </template>
          <template v-if="item.prop === 'price'">
            <el-text class="mx-1" type="primary">{{ row.price / 100 }}</el-text>
          </template>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty class="vab-data-empty" :description="translate('暂无数据')" />
      </template>
    </el-table>
    <el-pagination v-if="rows.total > queryForm.pageSize" background :current-page="queryForm.page" :layout="layout"
      :page-size="queryForm.pageSize" :total="rows.total" @current-change="handleCurrentChange"
      @size-change="handleSizeChange" />
    <discounts-serials-edit ref="editRef" @fetch-data="fetchData" @handle-edit="handleEdit" />
    <discounts-serials-status ref="statusRef" @fetch-data="fetchData" />
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import VabDraggable from 'vuedraggable'
import { ArrowDown, Download, Edit, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { serialsList } from '/@/api/customers'
import { getStorage, setStorage } from '/@/utils/storage'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as XLSX from "xlsx";

const templateName = 'CustomersDiscountsSerials'
defineOptions({
  name: templateName,
})

const layout = ref('sizes, prev, pager, next, jumper, total')
const editRef = ref<any>(null)
const statusRef = ref<any>(null)

const state = reactive({
  operationFixed: true,
  selectionRows: [],
  fold: true,
  loading: false,
  downloading: false
})

const queryForm = reactive({
  filter: {
    keywords: '',
    batch: '',
    code: '',
    type: '',
    expire: '',
    id: '',
    status: '',
  },
  page: 1,
  pageSize: Number(getStorage('pageSize') || 20),
  sort: '+id',
})

const rows = reactive({
  total: 0,
  list: [],
})

const columns = ref([
  {
    label: translate('编号'),
    prop: 'id',
    width: 80,
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('批次'),
    prop: 'batch',
    sortable: true,
    disableCheck: true,
  },
  {
    label: translate('序列号'),
    prop: 'code',
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('类型'),
    prop: 'type',
    width: 100,
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('升级'),
    prop: 'level',
    width: 100,
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('续期(天)'),
    prop: 'days',
    width: 100,
    sortable: false,
    disableCheck: false,
  },
  {
    label: translate('积分'),
    prop: 'credit',
    width: 100,
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('售价(元)'),
    prop: 'price',
    width: 120,
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('有效期'),
    prop: 'times_expire',
    width: 180,
    sortable: false,
    disableCheck: false,
  },
  {
    label: translate('创建时间'),
    prop: 'created_at',
    width: 180,
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('最后更新时间'),
    prop: 'updated_at',
    width: 180,
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('状态'),
    prop: 'status',
    width: 80,
    sortable: true,
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
const checkList = ref<any>(myCheckList[templateName] || ['id', 'batch', 'code', 'price', 'created_at', 'status'])
const finallyColumns = computed(() => {
  return columns.value.filter((item: any) => checkList.value.includes(item.prop))
})

const setSelectRows = (selection: any) => {
  state.selectionRows = selection.map((element: any) => element.id as number)
}

const handleFold = () => {
  state.fold = !state.fold
}
const changeCheck = () => {
  const savedCheckList = getStorage('checkList') || {}
  savedCheckList[templateName] = JSON.parse(JSON.stringify(checkList.value))
  savedCheckList[`${templateName}Order`] = columns.value.map((item: any) => item.prop || item.key)
  setStorage('checkList', savedCheckList)
}

const handleSortChange = (column: any) => {
  queryForm.sort = `${column.order === 'descending' ? '-' : '+'}${column.prop}`
  fetchData()
}

const fetchData = async () => {
  try {
    if (state.loading) return
    state.loading = true
    const { data }: any = await serialsList(queryForm)
    rows.list = data?.list || []
    rows.total = data?.total || 0
    state.loading = false
  } catch (error) {
    console.error('Fetch data error:', error)
    // 可以加入错误处理逻辑，如显示错误信息
  }
}

const handleStatus = (row: any = {}) => {
  if (!row) {
    if (state.selectionRows.length === 0) {
      ElMessage({
        message: translate('请选择需要修改状态的数据'),
        type: 'error',
      })
      return
    }
  }
  let rowIds = []
  if (row) {
    rowIds.push(row.id)
  } else {
    rowIds = [...state.selectionRows]
  }
  statusRef.value.showStatus(rowIds)
}

// 导出为 Excel 的方法
function exportToExcel(data: any[], fileName: string = 'export') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

const handleDownload = async (row: any = {}) => {
  if (!row) {
    if (state.selectionRows.length === 0) {
      ElMessage({
        message: translate('请选择需要下载的数据'),
        type: 'error',
      })
      return
    }
  }
  let rowIds = []
  if (row) {
    rowIds.push(row.id)
  } else {
    rowIds = [...state.selectionRows]
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');

  const exportData = (rows?.list || []).filter((item: any) => rowIds.includes(item.id)).map((item: any) => {
    if (rowIds.includes(item.id)) return {
      [translate('编号')]: item.id,
      [translate('批次')]: item.batch,
      [translate('序列号')]: item.code,
      [translate('类型')]: item.type === 4 ? translate('综合') : (item.type === 3 ? translate('设备') : (item.type === 2 ? translate('升级') : (item.type === 1 ? translate('积分') : translate('续期')))),
      [translate('升级')]: item.level,
      [translate('续期(天)')]: item.days,
      [translate('积分')]: item.credit,
      [translate('售价(元)')]: (item.price || 0) / 100,
      [translate('有效期')]: item.times_expire,
      [translate('创建时间')]: item.created_at,
      [translate('最后更新时间')]: item.updated_at,
      [translate('状态')]: item.status === 3 ? translate('回收禁用') : (item.status === 2 ? translate('已用不可用') : (item.status === 1 ? translate('已售正常可用') : translate('待售不可用'))),
    }
  })
  exportToExcel(exportData, `${year}${month}${day}${hours}${minutes}`)
}
const handleDownloadAll = async () => {
  if (state.downloading) return
  state.downloading = true
  try {
    const pageSize = 100
    const mapRow = (item: any) => ({
      [translate('编号')]: item.id,
      [translate('批次')]: item.batch,
      [translate('序列号')]: item.code,
      [translate('类型')]: item.type === 4 ? translate('综合') : (item.type === 3 ? translate('设备') : (item.type === 2 ? translate('升级') : (item.type === 1 ? translate('积分') : translate('续期')))),
      [translate('升级')]: item.level,
      [translate('续期(天)')]: item.days,
      [translate('积分')]: item.credit,
      [translate('售价(元)')]: (item.price || 0) / 100,
      [translate('有效期')]: item.times_expire,
      [translate('创建时间')]: item.created_at,
      [translate('最后更新时间')]: item.updated_at,
      [translate('状态')]: item.status === 3 ? translate('回收禁用') : (item.status === 2 ? translate('已用不可用') : (item.status === 1 ? translate('已售正常可用') : translate('待售不可用'))),
    })
    const exportData: any[] = []
    // C-C6: 按 total 循环分页收集，每页只 push 一次，避免递归把同一引用重复追加导致数据翻倍
    const { data: firstPage }: any = await serialsList({ page: 1, pageSize })
    const total = firstPage?.total || 0
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    for (let page = 1; page <= totalPages; page++) {
      const { data }: any = page === 1 ? { data: firstPage } : await serialsList({ page, pageSize })
      if (data?.list?.length) {
        exportData.push(...data.list.map(mapRow))
      }
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    exportToExcel(exportData, `${year}${month}${day}${hours}${minutes}_all`)
  } catch (error) {
    console.error('导出全部序列号失败:', error)
    ElMessage.error(translate('导出失败，请稍后重试'))
  } finally {
    state.downloading = false
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
// 添加
const handleEdit = (row: any = {}) => {
  editRef.value.showEdit(row)
}
const queryData = () => {
  queryForm.page = 1
  fetchData()
}

// 重置查询条件
const handleReset = () => {
  queryForm.filter.keywords = ''
  queryForm.filter.batch = ''
  queryForm.filter.code = ''
  queryForm.filter.type = ''
  queryForm.filter.expire = ''
  queryForm.filter.id = ''
  queryForm.filter.status = ''
  queryForm.page = 1
  queryData()
}

const init = () => {
  fetchData()
}

/* 生命周期钩子 */
onMounted(() => { })
onBeforeUnmount(() => { /* 组件卸载前清理逻辑 */ })
onBeforeMount(() => {
  init()
})
</script>

<style lang="scss" scoped>
.is-text {
  padding: 0 !important;
  height: 12px !important;
}
</style>