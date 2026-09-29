<!--
 * @Author: trexwb
 * @Date: 2025-03-25 11:42:30
 * @LastEditors: ${git_name}
 * @LastEditTime: 2026-09-14 17:07:18
 * @FilePath: /fastenerTradeWorkbench/Users/wbtrex/website/localServer/node/edtib/client/console/web/src/views/wikis/docs/downloads.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <vab-query-form v-permissions="{ permission: ['standardsDownloads:read'] }">
      <vab-query-form-top-panel>
        <el-form :inline="true" label-width="80px" :model="queryForm" @submit.prevent>
          <el-form-item :label="translate('模糊搜索')">
            <el-input
              v-model="queryForm.filter.keywords"
              clearable
              :placeholder="translate('请输入关键字模糊搜索')"
              @keyup.enter="queryData"
            />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('状态')" label-width="60px" style="width: 240px">
            <el-select v-model="queryForm.filter.status" clearable :placeholder="translate('请选择状态')">
              <el-option :label="translate('全部')" value="" />
              <el-option v-for="(item, key) in configuration.status || []" :key="`status[${key}]`" :label="item" :value="key" />
            </el-select>
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
        <el-button
          v-permissions="{ permission: ['standardsDownloads:read'] }"
          :disabled="state.selectionRows.length === 0"
          :icon="Download"
          type="primary"
          @click="handleBatchExport"
        >
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
    <el-table
      ref="tableSortRef"
      v-loading="state.loading"
      :border="true"
      :data="rows.list"
      :stripe="true"
      @selection-change="setSelectRows"
      @sort-change="handleSortChange"
    >
      <el-table-column type="selection" width="38" />
      <el-table-column
        v-for="(item, index) in finallyColumns"
        :key="index"
        align="center"
        :label="item.label"
        :prop="item.prop"
        show-overflow-tooltip
        :sortable="item.sortable"
        :width="item.width"
      >
        <template #default="{ row }">
          <template v-if="item.prop === 'doc.title'">
            <div style="text-align: left">{{ row.doc.title }}</div>
          </template>
          <template v-if="item.prop === 'status'">
            <el-tag v-if="row.status === 0" type="info">{{ translate('禁用') }}</el-tag>
            <el-tag v-if="row.status === 1" type="success">{{ translate('启用') }}</el-tag>
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
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { useAclStore } from '/@/store/modules/acl'
import VabDraggable from 'vuedraggable'
import { Delete, Download, Edit, Plus, Refresh, Search, Upload, View } from '@element-plus/icons-vue'
import { downloadsList } from '/@/api/downloads'
import { getStorage, setStorage } from '/@/utils/storage'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as XLSX from 'xlsx'

const templateName = 'WikisDocsDownloads'
defineOptions({
  name: templateName,
})

/* 权限和语言相关状态 */
const aclStore = useAclStore()
const { configuration } = storeToRefs(aclStore) // 解构多语言列表响应式引用

const layout = ref('sizes, prev, pager, next, jumper, total')
const editRef = ref<any>(null)
const viewRef = ref<any>(null)

const state = reactive({
  operationFixed: true,
  selectionRows: [],
  fold: true,
  loading: false,
})

const queryForm = reactive({
  filter: {
    keywords: '',
    id: '',
    title: '',
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
    label: translate('文件名'),
    prop: 'doc.title',
    sortable: false,
    disableCheck: true,
  },
  {
    label: translate('所需积分'),
    prop: 'doc.credit',
    sortable: false,
    disableCheck: false,
  },
  {
    label: translate('用户名'),
    prop: 'user.nickname',
    sortable: false,
    disableCheck: false,
  },
  {
    label: translate('真实姓名'),
    prop: 'user.truename',
    sortable: false,
    disableCheck: false,
  },
  {
    label: translate('邮箱'),
    prop: 'user.email',
    sortable: false,
    disableCheck: false,
  },
  {
    label: translate('手机'),
    prop: 'user.mobile',
    sortable: false,
    disableCheck: false,
  },
  {
    label: 'UUID',
    prop: 'uuid',
    sortable: false,
    disableCheck: false,
  },
  {
    label: translate('积分'),
    prop: 'use_credit',
    width: 80,
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('次数'),
    prop: 'use_limit',
    width: 120,
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('最后时效'),
    prop: 'times_expire',
    width: 150,
    sortable: true,
    disableCheck: true,
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
const checkList = ref<any>(
  myCheckList[templateName] || ['id', 'doc.title', 'user.nickname', 'use_credit', 'use_limit', 'times_expire', 'created_at', 'status']
)
const finallyColumns = computed(() => {
  return columns.value.filter((item: any) => checkList.value.includes(item.prop))
})

const setSelectRows = (selection: any) => {
  state.selectionRows = selection.map((element: any) => element.id as number)
}

// 批量导出
const handleBatchExport = () => {
  if (state.selectionRows.length === 0) {
    ElMessage({
      message: translate('请选择需要导出的数据'),
      type: 'error',
    })
    return
  }
  const rowIds = state.selectionRows as number[]
  const exportData = ((rows.list || []) as any[])
    .filter((item: any) => rowIds.includes(item.id))
    .map((item: any) => ({
      [translate('编号')]: item.id,
      [translate('文件名')]: item.doc?.title || '',
      [translate('所需积分')]: item.doc?.credit || 0,
      [translate('用户名')]: item.user?.nickname || '',
      [translate('真实姓名')]: item.user?.truename || '',
      [translate('邮箱')]: item.user?.email || '',
      [translate('手机')]: item.user?.mobile || '',
      UUID: item.uuid,
      [translate('积分')]: item.use_credit,
      [translate('次数')]: item.use_limit,
      [translate('最后时效')]: item.times_expire,
      [translate('创建时间')]: item.created_at,
      [translate('最后更新时间')]: item.updated_at,
      [translate('状态')]: item.status === 1 ? translate('启用') : translate('禁用'),
    }))
  if (exportData.length === 0) {
    ElMessage({
      message: translate('暂无可导出的数据'),
      type: 'error',
    })
    return
  }
  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  XLSX.writeFile(workbook, `${translate('下载记录')}-${stamp}.xlsx`)
  ElMessage({
    message: translate('导出成功'),
    type: 'success',
  })
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
    const { data }: any = await downloadsList(queryForm)
    rows.list = data?.list || []
    rows.total = data?.total || 0
    state.loading = false
  } catch (error) {
    console.error('Fetch data error:', error)
    // 可以加入错误处理逻辑，如显示错误信息
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
  queryForm.filter.keywords = ''
  queryForm.filter.id = ''
  queryForm.filter.title = ''
  queryForm.filter.status = ''
  queryForm.page = 1
  queryData()
}

const init = () => {
  fetchData()
}

/* 生命周期钩子 */
onMounted(() => {})
onBeforeUnmount(() => {
  /* 组件卸载前清理逻辑 */
})
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
