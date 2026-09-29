<!--
 * @Author: ${git_name}
 * @Date: 2025-07-28 13:41:26
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-07-28 13:45:07
 * @FilePath: /console/web/src/views/standards/capabilities/interpretations.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <vab-query-form v-permissions="{ permission: ['standardsCapabilitiesInterpretations:read'] }">
      <vab-query-form-top-panel>
        <el-form :inline="true" label-width="80px" :model="queryForm" @submit.prevent>
          <el-form-item :label="translate('模糊搜索')">
            <el-input v-model="queryForm.filter.keywords" clearable :placeholder="translate('请输入关键字模糊搜索')" @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" label="ID" label-width="40px">
            <el-input v-model.trim="queryForm.filter.id" clearable :placeholder="translate('请输入ID搜索')" @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('状态')" label-width="60px" style="width: 240px">
            <el-select v-model="queryForm.filter.status" clearable :placeholder="translate('请选择状态')">
              <el-option :label="translate('全部')" value="" />
              <el-option v-for="(item, key) in (configuration.status || [])" :key="`status[${key}]`" :label="item"
                :value="key" />
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
        <el-button v-permissions="{ permission: ['standardsCapabilitiesInterpretations:delete'] }"
          :disabled="state.selectionRows.length === 0" :icon="Delete" type="danger"
          @click="handleDelete(null)">{{ translate('批量删除') }}</el-button>
        <el-button v-permissions="{ permission: ['standardsCapabilitiesInterpretations:write'] }"
          :disabled="state.selectionRows.length === 0" :icon="Upload" type="success"
          @click="handleEnable(null)">{{ translate('批量启用') }}</el-button>
        <el-button v-permissions="{ permission: ['standardsCapabilitiesInterpretations:write'] }"
          :disabled="state.selectionRows.length === 0" :icon="Download" type="warning"
          @click="handleDisable(null)">{{ translate('批量禁用') }}</el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel>
        <el-button v-permissions="{ permission: ['standardsCapabilitiesInterpretations:write'] }" :icon="Plus"
          type="primary" @click="handleEdit(null)">{{ translate('添加') }}</el-button>
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
          <template v-if="item.prop === 'titles'">
            <div style="text-align: left;">{{ Object.values(row.titles).join('|') }}</div>
          </template>
          <template v-if="item.prop === 'product.standard'">
            <el-text class="mx-1" type="primary">{{ `${row.product.standard}${!row.product.grade ? '' : '/' +
              row.product.grade}${row.product.code}${!row.product.year ? '' : '-' + row.product.year}` }}</el-text>
          </template>
          <template v-if="item.prop === 'product.names'">
            <el-text class="mx-1" type="primary">{{ Object.values(row.product.names || {}).join('|') }}</el-text>
          </template>
          <template v-if="item.prop === 'status'">
            <el-tag v-if="row.status === 0" type="info">{{ translate('禁用') }}</el-tag>
            <el-tag v-if="row.status === 1" type="success">{{ translate('启用') }}</el-tag>
          </template>
        </template>
      </el-table-column>
      <el-table-column align="center" :fixed="state.operationFixed ? 'right' : false" :label="translate('操作')" width="100">
        <template #header>
          <el-checkbox v-model="state.operationFixed" :label="translate('固定')" size="large" :value="translate('固定')" />
        </template>
        <template #default="{ row }">
          <el-tooltip :content="translate('预览')" placement="bottom">
            <el-button v-permissions="{ permission: ['standardsCapabilitiesInterpretations:read'] }" :icon="View" text
              type="primary" @click="handleView(row)" />
          </el-tooltip>
          <el-tooltip :content="translate('修改')" placement="bottom">
            <el-button v-permissions="{ permission: ['standardsCapabilitiesInterpretations:write'] }" :icon="Edit" text
              type="success" @click="handleEdit(row)" />
          </el-tooltip>
          <el-tooltip :content="translate('删除')" placement="bottom">
            <el-button v-permissions="{ permission: ['standardsCapabilitiesInterpretations:delete'] }" :icon="Delete"
              text type="danger" @click="handleDelete(row)" />
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
    <capabilities-interpretations-edit ref="editRef" @fetch-data="fetchData" @handle-edit="handleEdit" />
    <capabilities-interpretations-view ref="viewRef" @handle-delete="handleDelete" @handle-edit="handleEdit" />
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { useAclStore } from '/@/store/modules/acl'
import VabDraggable from 'vuedraggable'
import { Delete, Download, Edit, Plus, Refresh, Search, Upload, View } from '@element-plus/icons-vue'
import { interpretationsList, interpretationsDelete, interpretationsDisable, interpretationsEnable } from '/@/api/interpretations'
import { getStorage, setStorage } from '/@/utils/storage'
import { ElMessage, ElMessageBox } from 'element-plus'

const templateName = 'StandardsCapabilitiesInterpretations'
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
    product_id: '',
    product: '',
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
    label: translate('解读标题'),
    prop: 'titles',
    sortable: true,
    disableCheck: true,
  },
  {
    label: translate('标准编号'),
    prop: 'product.standard',
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('产品名称'),
    prop: 'product.names',
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
const checkList = ref<any>(myCheckList[templateName] || ['id', 'titles', 'product.standard', 'created_at', 'status'])
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

const handleView = (row: any = {}) => {
  viewRef.value.showView(row)
}

const fetchData = async () => {
  try {
    if (state.loading) return
    state.loading = true
    const { data }: any = await interpretationsList(queryForm)
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
// 添加
const handleEdit = (row: any = {}) => {
  editRef.value.showEdit(row)
}
// 批量删除
const handleDelete = (row: any = {}) => {
  if (!row) {
    if (state.selectionRows.length === 0) {
      ElMessage({
        message: translate('请选择需要删除的数据'),
        type: 'error',
      })
      return
    }
  }
  ElMessageBox.confirm(translate('您确定要删除选中项吗？'), translate('提示'), {
    draggable: true,
    type: 'warning',
  })
    .then(async () => {
      let rowIds = []
      if (row) {
        rowIds.push(row.id)
      } else {
        rowIds = [...state.selectionRows]
      }
      state.loading = true
      await interpretationsDelete({
        id: rowIds,
      })
      ElMessage({
        message: translate('删除成功'),
        type: 'success',
      })
      state.loading = false
      fetchData()
    })
    .catch((err) => {
      console.log(err)
    })
}
// 批量启用
const handleEnable = (row: any = {}) => {
  if (!row) {
    if (state.selectionRows.length === 0) {
      ElMessage({
        message: translate('请选择需要启用的数据'),
        type: 'error',
      })
      return
    }
  }
  ElMessageBox.confirm(translate('您确定要启用选中项吗？'), translate('提示'), {
    draggable: true,
    type: 'warning',
  })
    .then(async () => {
      let rowIds = []
      if (row) {
        rowIds.push(row.id)
      } else {
        rowIds = [...state.selectionRows]
      }
      state.loading = true
      await interpretationsEnable({
        id: rowIds,
      })
      ElMessage({
        message: translate('启用成功'),
        type: 'success',
      })
      state.loading = false
      fetchData()
    })
    .catch((err) => {
      console.log(err)
    })
}
// 批量禁用
const handleDisable = (row: any = {}) => {
  if (!row) {
    if (state.selectionRows.length === 0) {
      ElMessage({
        message: translate('请选择需要禁用的数据'),
        type: 'error',
      })
      return
    }
  }
  ElMessageBox.confirm(translate('您确定要禁用选中项吗？'), translate('提示'), {
    draggable: true,
    type: 'warning',
  })
    .then(async () => {
      let rowIds = []
      if (row) {
        rowIds.push(row.id)
      } else {
        rowIds = [...state.selectionRows]
      }
      state.loading = true
      await interpretationsDisable({
        id: rowIds,
      })
      ElMessage({
        message: translate('禁用成功'),
        type: 'success',
      })
      state.loading = false
      fetchData()
    })
    .catch((err) => {
      console.log(err)
    })
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
  queryForm.filter.product_id = ''
  queryForm.filter.product = ''
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