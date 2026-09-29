<!--
 * @Description: 材料类别管理（从材料库管理页拆分，独立权限 standardsMaterialCategories）
 *   列表 + 编辑弹窗（编码 / 多语言名称 / 缩写 / 排序 / 状态）
 * @Date: 2026-09-14
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <vab-query-form v-permissions="{ permission: ['standardsMaterialCategories:read'] }">
      <vab-query-form-top-panel>
        <el-form :inline="true" label-width="80px" :model="queryForm" @submit.prevent>
          <el-form-item :label="translate('状态')">
            <el-select v-model="queryForm.filter.status" clearable :placeholder="translate('请选择状态')" style="width: 180px">
              <el-option :label="translate('全部')" value="" />
              <el-option :label="translate('启用')" value="1" />
              <el-option :label="translate('停用')" value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button :icon="Search" :loading="state.loading" native-type="submit" type="primary" @click="queryData">
              {{ translate('查询') }}
            </el-button>
            <el-button :icon="Refresh" @click="resetQuery">{{ translate('重置') }}</el-button>
          </el-form-item>
        </el-form>
      </vab-query-form-top-panel>
      <vab-query-form-left-panel>
        <el-button
          v-permissions="{ permission: ['standardsMaterialCategories:delete'] }"
          :disabled="state.selectionRows.length === 0"
          :icon="Delete"
          type="danger"
          @click="handleDelete(null)"
        >
          {{ translate('批量删除') }}
        </el-button>
        <el-button
          v-permissions="{ permission: ['standardsMaterialCategories:write'] }"
          :disabled="state.selectionRows.length === 0"
          :icon="Upload"
          type="success"
          @click="handleEnable(null)"
        >
          {{ translate('批量启用') }}
        </el-button>
        <el-button
          v-permissions="{ permission: ['standardsMaterialCategories:write'] }"
          :disabled="state.selectionRows.length === 0"
          :icon="Download"
          type="warning"
          @click="handleDisable(null)"
        >
          {{ translate('批量停用') }}
        </el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel>
        <el-button v-permissions="{ permission: ['standardsMaterialCategories:write'] }" :icon="Plus" type="primary" @click="handleEdit()">
          {{ translate('新增类别') }}
        </el-button>
        <el-button @click="fetchData()">
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
      v-loading="state.loading"
      :border="true"
      :data="rows.list"
      row-key="id"
      :stripe="true"
      @selection-change="setSelectRows"
      @sort-change="handleSortChange"
    >
      <el-table-column align="center" type="selection" width="38" />
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
          <template v-if="item.prop === 'names'">
            {{ categoryLabel(row) }}
          </template>
          <template v-if="item.prop === 'abbreviation'">
            {{ row.abbreviation || '—' }}
          </template>
          <template v-if="item.prop === 'status'">
            <el-tag size="small" :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? translate('启用') : translate('停用') }}
            </el-tag>
          </template>
        </template>
      </el-table-column>
      <el-table-column align="center" :fixed="state.operationFixed ? 'right' : false" :label="translate('操作')" width="100">
        <template #header>
          <el-checkbox v-model="state.operationFixed" :label="translate('固定')" size="large" :value="translate('固定')" />
        </template>
        <template #default="{ row }">
          <el-tooltip :content="translate('修改')" placement="bottom">
            <el-button
              v-permissions="{ permission: ['standardsMaterialCategories:write'] }"
              :icon="Edit"
              text
              type="success"
              @click="handleEdit(row)"
            />
          </el-tooltip>
          <el-tooltip :content="translate('删除')" placement="bottom">
            <el-button
              v-permissions="{ permission: ['standardsMaterialCategories:delete'] }"
              :icon="Delete"
              text
              type="danger"
              @click="handleDelete(row)"
            />
          </el-tooltip>
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

    <materials-categories-edit ref="editRef" @fetch-data="fetchData" />
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import VabDraggable from 'vuedraggable'
import { Delete, Download, Edit, Plus, Refresh, Search, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  materialCategoriesList,
  materialCategoriesDelete,
  materialCategoriesEnable,
  materialCategoriesDisable,
  materialCategoriesRestore,
} from '/@/api/materials'
import { getStorage, setStorage } from '/@/utils/storage'

const templateName = 'StandardsMaterialCategories'
defineOptions({
  name: templateName,
})

const layout = ref('sizes, prev, pager, next, jumper, total')
const editRef = ref<any>(null)

const state = reactive({
  loading: false,
  operationFixed: true,
  selectionRows: [] as number[],
})

const setSelectRows = (selection: any) => {
  state.selectionRows = selection.map((element: any) => element.id as number)
}

const queryForm = reactive({
  filter: {
    status: '',
  },
  page: 1,
  pageSize: Number(getStorage('pageSize') || 20),
  sort: '+sort',
})

const rows = reactive({
  total: 0,
  list: [] as any[],
})

const columns = ref([
  {
    label: translate('编号'),
    prop: 'id',
    width: 80,
    sortable: true,
    disableCheck: true,
  },
  {
    label: translate('类别编码'),
    prop: 'code',
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('类别名称'),
    prop: 'names',
    sortable: false,
    disableCheck: false,
  },
  {
    label: translate('缩写'),
    prop: 'abbreviation',
    width: 100,
    sortable: false,
    disableCheck: false,
  },
  {
    label: translate('排序'),
    prop: 'sort',
    width: 80,
    sortable: false,
    disableCheck: false,
  },
  {
    label: translate('状态'),
    prop: 'status',
    width: 80,
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('更新时间'),
    prop: 'updated_at',
    width: 160,
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
const checkList = ref<any>(myCheckList[templateName] || ['id', 'code', 'names', 'abbreviation', 'sort', 'status', 'updated_at'])
const finallyColumns = computed(() => {
  return columns.value.filter((item: any) => checkList.value.includes(item.prop))
})
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

const categoryLabel = (item: any) => {
  const names = item.names || {}
  return names.zh_cn || names.zh || Object.values(names)[0] || item.code
}

onMounted(() => {
  fetchData()
})

const fetchData = async () => {
  state.loading = true
  try {
    const { data } = await materialCategoriesList({ ...queryForm })
    rows.list = data?.list || []
    rows.total = Number(data?.total || 0)
  } catch (error: any) {
    console.error('[materials] 类别列表查询失败:', error)
  } finally {
    state.loading = false
  }
}

const queryData = () => {
  queryForm.page = 1
  fetchData()
}

const resetQuery = () => {
  queryForm.filter.status = ''
  queryData()
}

const handleCurrentChange = (value: number) => {
  queryForm.page = value
  fetchData()
}

const handleSizeChange = (value: number) => {
  queryForm.pageSize = value
  queryData()
}

const handleEdit = (row?: any) => {
  if (editRef.value) editRef.value.showEdit(row)
}

// row 传空时按批量选中项处理
const handleEnable = async (row: any = null) => {
  if (!row && state.selectionRows.length === 0) {
    ElMessage({ message: translate('请选择需要启用的数据'), type: 'error' })
    return
  }
  const rowIds: any[] = row ? [row.id] : [...state.selectionRows]
  try {
    await ElMessageBox.confirm(
      row ? translate(`确认要启用类别「${categoryLabel(row)}」吗？`) : translate(`确认要启用选中的 ${rowIds.length} 个类别吗？`),
      translate('状态变更'),
      { confirmButtonText: translate('确认'), cancelButtonText: translate('取消'), type: 'warning', draggable: false }
    )
  } catch {
    return
  }
  try {
    await materialCategoriesEnable({ id: rowIds })
    ElMessage.success(translate('状态已更新'))
    fetchData()
  } catch (error: any) {
    console.error('[materials] 类别状态更新失败:', error)
  }
}

const handleDisable = async (row: any = null) => {
  if (!row && state.selectionRows.length === 0) {
    ElMessage({ message: translate('请选择需要停用的数据'), type: 'error' })
    return
  }
  const rowIds: any[] = row ? [row.id] : [...state.selectionRows]
  try {
    await ElMessageBox.confirm(
      row ? translate(`确认要停用类别「${categoryLabel(row)}」吗？`) : translate(`确认要停用选中的 ${rowIds.length} 个类别吗？`),
      translate('状态变更'),
      { confirmButtonText: translate('确认'), cancelButtonText: translate('取消'), type: 'warning', draggable: false }
    )
  } catch {
    return
  }
  try {
    await materialCategoriesDisable({ id: rowIds })
    ElMessage.success(translate('状态已更新'))
    fetchData()
  } catch (error: any) {
    console.error('[materials] 类别状态更新失败:', error)
  }
}

const handleDelete = async (row: any = null) => {
  if (!row && state.selectionRows.length === 0) {
    ElMessage({ message: translate('请选择需要删除的数据'), type: 'error' })
    return
  }
  const rowIds: any[] = row ? [row.id] : [...state.selectionRows]
  try {
    await ElMessageBox.confirm(
      row
        ? translate(`确认要删除类别「${categoryLabel(row)}」吗？删除后可在回收站恢复。`)
        : translate(`确认要删除选中的 ${rowIds.length} 个类别吗？删除后可在回收站恢复。`),
      translate('删除确认'),
      { confirmButtonText: translate('确认删除'), cancelButtonText: translate('取消'), type: 'warning', draggable: false }
    )
  } catch {
    return
  }
  try {
    await materialCategoriesDelete({ id: rowIds })
    ElMessage.success(translate('删除成功'))
    fetchData()
  } catch (error: any) {
    console.error('[materials] 类别删除失败:', error)
  }
}

const handleRestore = async (row: any) => {
  try {
    await ElMessageBox.confirm(translate(`确认要恢复类别「${categoryLabel(row)}」吗？`), translate('恢复确认'), {
      confirmButtonText: translate('确认'),
      cancelButtonText: translate('取消'),
      type: 'warning',
      draggable: false,
    })
  } catch {
    return
  }
  try {
    await materialCategoriesRestore({ id: row.id })
    ElMessage.success(translate('恢复成功'))
    fetchData()
  } catch (error: any) {
    console.error('[materials] 类别恢复失败:', error)
  }
}
</script>

<style scoped lang="scss">
:deep(.operation-column) {
  .cell {
    white-space: nowrap;
  }

  .el-checkbox__label {
    white-space: nowrap;
  }
}
</style>
