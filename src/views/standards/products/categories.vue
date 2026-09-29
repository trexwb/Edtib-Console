<!--
 * @Author: trexwb
 * @Date: 2025-03-25 11:42:30
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-07-09 10:42:51
 * @FilePath: /console/web/src/views/standards/products/categories.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <vab-query-form v-permissions="{ permission: ['standardsCategories:read'] }">
      <vab-query-form-left-panel>
        <el-button v-permissions="{ permission: ['standardsCategories:delete'] }"
          :disabled="state.selectionRows.length === 0" :icon="Delete" type="danger"
          @click="handleDelete(null)">{{ translate('批量删除') }}</el-button>
        <el-button v-permissions="{ permission: ['standardsCategories:write'] }"
          :disabled="state.selectionRows.length === 0" :icon="Upload" type="success"
          @click="handleEnable(null)">{{ translate('批量启用') }}</el-button>
        <el-button v-permissions="{ permission: ['standardsCategories:write'] }"
          :disabled="state.selectionRows.length === 0" :icon="Download" type="warning"
          @click="handleDisable(null)">{{ translate('批量禁用') }}</el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel>
        <el-button v-permissions="{ permission: ['standardsCategories:write'] }" :icon="Plus" type="primary"
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
    <el-table ref="tableSortRef" v-loading="state.loading" :border="true" :data="rows.list" default-expand-all
      row-key="id" :stripe="true" @selection-change="setSelectRows" @sort-change="handleSortChange">
      <el-table-column type="selection" width="38" />
      <el-table-column v-for="(item, index) in finallyColumns" :key="index" align="center" :label="item.label"
        :prop="item.prop" show-overflow-tooltip :sortable="item.sortable" :width="item.width">
        <template #default="{ row }">
          <template v-if="item.prop === 'names'">
            <div style="text-align: left;">{{ Object.values(row.names).join('|') }}</div>
          </template>
          <div v-if="item.prop === 'covers'">
            <el-image v-if="row.covers && row.covers.length > 0" :src="`${row.covers[0]?.url}!a50`"
              @click="state.srcList = row.covers.map((element: any) => `${element.url}!a600`); state.showPreview = true" />
            <el-text v-else class="mx-1" type="info">{{ translate('无') }}</el-text>
          </div>
          <template v-if="item.prop === 'status'">
            <el-tag v-if="row.status === 0" type="info">{{ translate('禁用') }}</el-tag>
            <el-tag v-if="row.status === 1" type="success">{{ translate('启用') }}</el-tag>
          </template>
          <template v-if="item.prop === 'sort'">
            <span class="sort" v-show="!(canInputEdits == row?.id)" @click="editInputItem(row?.id)">
              {{ row?.sort || 0 }}
            </span>
            <el-input v-show="canInputEdits == row.id" :id="'input' + row.id" v-model.trim="row.sort"
              @blur="handleSort(row?.sort, row?.id)" maxlength="5"
              :formatter="(value: string) => value.replace(/\D/g, '')"
              :parser="(value: string) => value.replace(/\D/g, '')" :ref="setInputRef(row.id)"
              :placeholder="translate('按自然排序从小到大，但是0永远在最后')" />
          </template>
        </template>
      </el-table-column>
      <el-table-column align="center" :fixed="state.operationFixed ? 'right' : false" :label="translate('操作')" width="100">
        <template #header>
          <el-checkbox v-model="state.operationFixed" :label="translate('固定')" size="large" :value="translate('固定')" />
        </template>
        <template #default="{ row }">
          <el-tooltip :content="translate('预览')" placement="bottom">
            <el-button v-permissions="{ permission: ['standardsCategories:read'] }" :icon="View" text type="primary"
              @click="handleView(row)" />
          </el-tooltip>
          <el-tooltip :content="translate('修改')" placement="bottom">
            <el-button v-permissions="{ permission: ['standardsCategories:write'] }" :icon="Edit" text type="success"
              @click="handleEdit(row)" />
          </el-tooltip>
          <el-tooltip :content="translate('删除')" placement="bottom">
            <el-button v-permissions="{ permission: ['standardsCategories:delete'] }" :icon="Delete" text type="danger"
              @click="handleDelete(row)" />
          </el-tooltip>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty class="vab-data-empty" :description="translate('暂无数据')" />
      </template>
    </el-table>
    <products-categories-edit ref="editRef" @fetch-data="fetchData" @handle-edit="handleEdit" />
    <products-categories-view ref="viewRef" @handle-delete="handleDelete" @handle-edit="handleEdit" />
    <el-image-viewer v-if="state.showPreview" :url-list="state.srcList" show-progress :initial-index="0"
      @close="state.showPreview = false" />
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import VabDraggable from 'vuedraggable'
import { Delete, Download, Plus, Search, Upload, Edit, View } from '@element-plus/icons-vue'
import { categoriesList, categoriesDelete, categoriesDisable, categoriesEnable, categoriesSort } from '/@/api/categories'
import { getStorage, setStorage } from '/@/utils/storage'
import { ElMessage, ElMessageBox } from 'element-plus'

const templateName = 'StandardsProductsCategories'
defineOptions({
  name: templateName,
})

const editRef = ref<any>(null)
const viewRef = ref<any>(null)

const state = reactive({
  operationFixed: true,
  selectionRows: [],
  fold: true,
  loading: false,
  showPreview: false,
  srcList: []
})

const queryForm = reactive({
  filter: {
    keywords: '',
    location: '',
    id: '',
    status: '',
  },
  page: 1,
  pageSize: Number(getStorage('pageSize') || 20),
  sort: '+sort',
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
    sortable: false,
  },
  {
    label: translate('分类名称'),
    prop: 'names',
    sortable: false,
    disableCheck: true,
  },
  {
    label: translate('缩写(拼音)'),
    prop: 'abbreviation',
    sortable: false,
    disableCheck: true,
  },
  {
    label: translate('图标'),
    prop: 'covers',
    width: 150,
    sortable: false,
    disableCheck: false,
  },
  {
    label: translate('排序'),
    prop: 'sort',
    width: 80,
    sortable: false,
    disableCheck: true,
  },
  {
    label: translate('创建时间'),
    prop: 'created_at',
    width: 180,
    sortable: false,
    disableCheck: false,
  },
  {
    label: translate('最后更新时间'),
    prop: 'updated_at',
    width: 180,
    sortable: false,
    disableCheck: false,
  },
  {
    label: translate('状态'),
    prop: 'status',
    width: 80,
    sortable: false,
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
const checkList = ref<any>(myCheckList[templateName] || ['id', 'names', 'abbreviation', 'sort', 'created_at', 'status'])
const finallyColumns = computed(() => {
  return columns.value.filter((item: any) => checkList.value.includes(item.prop))
})

const canInputEdits = ref('')
const inputRefs = ref<Record<string, HTMLInputElement>>({})
const setInputRef = (id: any) => {
  return (el: Element | ComponentPublicInstance | null) => {
    const inputEl = el as HTMLInputElement | null
    if (inputEl) {
      inputRefs.value[id] = inputEl
    } else {
      delete inputRefs.value[id]
    }
  }
}
const editInputItem = (id: any) => {
  canInputEdits.value = id
  nextTick(() => {
    inputRefs.value[id]?.focus()
  })
}

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
    const { data }: any = await categoriesList(queryForm)
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
// 排序
const handleSort = (sort: any, id: any) => {
  try {
    const { data }: any = categoriesSort({
      id: [id],
      sort: sort || 0,
    })
    ElMessage({
      message: translate('排序成功'),
      type: 'success',
    })
    canInputEdits.value = ''
  } catch (error) {
    console.error('Fetch data error:', error)
  }
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
      await categoriesDelete({
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
      await categoriesEnable({
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
      await categoriesDisable({
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