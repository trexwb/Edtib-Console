<!--
 * @Description: 材料库管理（材料标准 = 免费内容，无审核逻辑，有权限的管理员直接维护）
 *   列表 + 编辑抽屉（基本信息 / 化学成分 / 近似对照 三区块，子表全量替换）
 *   材料类别拆分至独立页面 categories.vue（类别管理）维护
 * @Date: 2026-09-14
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <vab-query-form v-permissions="{ permission: ['standardsMaterials:read'] }">
      <vab-query-form-top-panel>
        <el-form :inline="true" label-width="80px" :model="queryForm" @submit.prevent>
          <el-form-item :label="translate('模糊搜索')">
            <el-input
              v-model="queryForm.filter.keywords"
              clearable
              :placeholder="translate('牌号 / ISC / 别名 / 旧牌号')"
              @keyup.enter="queryData"
            />
          </el-form-item>
          <el-form-item :label="translate('类别')" label-width="60px">
            <el-select
              v-model="queryForm.filter.category_id"
              clearable
              filterable
              :placeholder="translate('全部类别')"
              style="width: 180px"
            >
              <el-option v-for="item in state.categories" :key="`cat${item.id}`" :label="categoryLabel(item)" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item :label="translate('状态')" label-width="60px" style="width: 220px">
            <el-select v-model="queryForm.filter.status" clearable :placeholder="translate('请选择状态')">
              <el-option :label="translate('全部')" value="" />
              <el-option v-for="(item, key) in configuration.status || []" :key="`status[${key}]`" :label="item" :value="key" />
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
          v-permissions="{ permission: ['standardsMaterials:write'] }"
          :disabled="state.selectionRows.length === 0"
          :icon="Delete"
          type="danger"
          @click="handleDelete(null)"
        >
          {{ translate('批量删除') }}
        </el-button>
        <el-button
          v-permissions="{ permission: ['standardsMaterials:write'] }"
          :disabled="state.selectionRows.length === 0"
          :icon="Upload"
          type="success"
          @click="handleEnable(null)"
        >
          {{ translate('批量启用') }}
        </el-button>
        <el-button
          v-permissions="{ permission: ['standardsMaterials:write'] }"
          :disabled="state.selectionRows.length === 0"
          :icon="Download"
          type="warning"
          @click="handleDisable(null)"
        >
          {{ translate('批量停用') }}
        </el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel>
        <el-button v-permissions="{ permission: ['standardsMaterials:write'] }" :icon="Plus" type="primary" @click="handleEdit()">
          {{ translate('新增材料') }}
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
          <template v-if="item.prop === 'code'">
            <span class="material-code">{{ row.code }}</span>
          </template>
          <template v-if="item.prop === 'category'">
            {{ row.category ? categoryName(row.category) : '—' }}
          </template>
          <template v-if="item.prop === 'standard'">
            {{ row.standard || '—' }}
          </template>
          <template v-if="item.prop === 'property'">
            <template v-if="(row.property || []).length">
              <el-tag v-for="tag in row.property.slice(0, 3)" :key="tag" class="material-tag" size="small" type="info">{{ tag }}</el-tag>
              <span v-if="row.property.length > 3" class="material-more">+{{ row.property.length - 3 }}</span>
            </template>
            <span v-else>—</span>
          </template>
          <template v-if="item.prop === 'density'">
            {{ row.density != null ? row.density : '—' }}
          </template>
          <template v-if="item.prop === 'status'">
            <el-tag size="small" :type="row.status === 1 ? 'success' : 'danger'">
              {{ (configuration.status || {})[row.status] || (row.status === 1 ? translate('启用') : translate('停用')) }}
            </el-tag>
          </template>
        </template>
      </el-table-column>
      <el-table-column
        align="center"
        class-name="operation-column"
        :fixed="state.operationFixed ? 'right' : false"
        :label="translate('操作')"
        width="100"
      >
        <template #header>
          <el-checkbox v-model="state.operationFixed" :label="translate('固定')" size="large" :value="translate('固定')" />
        </template>
        <template #default="{ row }">
          <el-tooltip :content="translate('编辑')" placement="bottom">
            <el-button
              v-permissions="{ permission: ['standardsMaterials:write'] }"
              :icon="Edit"
              text
              type="primary"
              @click="handleEdit(row)"
            />
          </el-tooltip>
          <el-tooltip v-if="!row.deleted_at" :content="translate('删除')" placement="bottom">
            <el-button
              v-permissions="{ permission: ['standardsMaterials:write'] }"
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

    <materials-edit ref="editRef" @fetch-data="fetchData" />
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { useAclStore } from '/@/store/modules/acl'
import VabDraggable from 'vuedraggable'
import { Delete, Download, Edit, Plus, Refresh, RefreshLeft, Search, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  materialsList,
  materialsDelete,
  materialsEnable,
  materialsDisable,
  materialsRestore,
  materialCategoriesList,
} from '/@/api/materials'
import { getStorage, setStorage } from '/@/utils/storage'

const templateName = 'StandardsMaterialsManage'
defineOptions({
  name: templateName,
})

const aclStore = useAclStore()
const { configuration } = storeToRefs(aclStore)

const layout = ref('sizes, prev, pager, next, jumper, total')
const editRef = ref<any>(null)

const state = reactive({
  loading: false,
  operationFixed: true,
  categories: [] as any[],
  selectionRows: [] as number[],
})

const setSelectRows = (selection: any) => {
  state.selectionRows = selection.map((element: any) => element.id as number)
}

const queryForm = reactive({
  filter: {
    keywords: '',
    category_id: '',
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

// 列宽策略照抄 shapes.vue：编号/性能(图标)/密度(公式)/排序/状态/更新时间定宽，内容列（牌号/ISC/类别/对应标准）自适应
const columns = ref([
  {
    label: translate('编号'),
    prop: 'id',
    width: 80,
    sortable: true,
    disableCheck: true,
  },
  {
    label: translate('牌号'),
    prop: 'code',
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('中国ISC'),
    prop: 'isc',
    sortable: false,
    disableCheck: false,
  },
  {
    label: translate('类别'),
    prop: 'category',
    sortable: false,
    disableCheck: false,
  },
  {
    label: translate('对应标准'),
    prop: 'standard',
    sortable: false,
    disableCheck: false,
  },
  {
    label: translate('性能'),
    prop: 'property',
    width: 150,
    sortable: false,
    disableCheck: false,
  },
  {
    label: translate('密度'),
    prop: 'density',
    width: 80,
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
const checkList = ref<any>(myCheckList[templateName] || ['id', 'code', 'isc', 'category', 'standard', 'status', 'updated_at'])
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
const categoryName = (category: any) => categoryLabel(category)

onMounted(() => {
  fetchCategoriesOptions()
  fetchData()
})

const fetchCategoriesOptions = async () => {
  // 类别下拉：含停用（管理视角），数量小直接全量
  try {
    const { data } = await materialCategoriesList({ page: 1, pageSize: 500 })
    state.categories = data?.list || []
  } catch {
    state.categories = []
  }
}

const fetchData = async () => {
  state.loading = true
  try {
    const { data } = await materialsList({ ...queryForm })
    rows.list = data?.list || []
    rows.total = Number(data?.total || 0)
  } catch (error: any) {
    console.error('[materials] 列表查询失败:', error)
  } finally {
    state.loading = false
  }
}

const queryData = () => {
  queryForm.page = 1
  fetchData()
}

const resetQuery = () => {
  queryForm.filter.keywords = ''
  queryForm.filter.category_id = ''
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

// 材料无审核逻辑：启用/停用即时生效（status 直接切换）；row 传空时按批量选中项处理
const handleEnable = async (row: any = null) => {
  if (!row && state.selectionRows.length === 0) {
    ElMessage({ message: translate('请选择需要启用的数据'), type: 'error' })
    return
  }
  const rowIds: any[] = row ? [row.id] : [...state.selectionRows]
  try {
    await ElMessageBox.confirm(
      row ? translate(`确认要启用材料「${row.code}」吗？`) : translate(`确认要启用选中的 ${rowIds.length} 条材料吗？`),
      translate('状态变更'),
      { confirmButtonText: translate('确认'), cancelButtonText: translate('取消'), type: 'warning', draggable: false }
    )
  } catch {
    return
  }
  try {
    await materialsEnable({ id: rowIds })
    ElMessage.success(translate('状态已更新'))
    fetchData()
  } catch (error: any) {
    console.error('[materials] 状态更新失败:', error)
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
      row ? translate(`确认要停用材料「${row.code}」吗？`) : translate(`确认要停用选中的 ${rowIds.length} 条材料吗？`),
      translate('状态变更'),
      { confirmButtonText: translate('确认'), cancelButtonText: translate('取消'), type: 'warning', draggable: false }
    )
  } catch {
    return
  }
  try {
    await materialsDisable({ id: rowIds })
    ElMessage.success(translate('状态已更新'))
    fetchData()
  } catch (error: any) {
    console.error('[materials] 状态更新失败:', error)
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
        ? translate(`确认要删除材料「${row.code}」吗？删除后可在回收站恢复。`)
        : translate(`确认要删除选中的 ${rowIds.length} 条材料吗？删除后可在回收站恢复。`),
      translate('删除确认'),
      { confirmButtonText: translate('确认删除'), cancelButtonText: translate('取消'), type: 'warning', draggable: false }
    )
  } catch {
    return
  }
  try {
    await materialsDelete({ id: rowIds })
    ElMessage.success(translate('删除成功'))
    fetchData()
  } catch (error: any) {
    console.error('[materials] 删除失败:', error)
  }
}

const handleRestore = async (row: any) => {
  try {
    await ElMessageBox.confirm(translate(`确认要恢复材料「${row.code}」吗？`), translate('恢复确认'), {
      confirmButtonText: translate('确认'),
      cancelButtonText: translate('取消'),
      type: 'warning',
      draggable: false,
    })
  } catch {
    return
  }
  try {
    await materialsRestore({ id: row.id })
    ElMessage.success(translate('恢复成功'))
    fetchData()
  } catch (error: any) {
    console.error('[materials] 恢复失败:', error)
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

.material-code {
  font-weight: 600;
}

.material-tag {
  margin-right: 4px;
}

.material-more {
  color: var(--el-color-info);
  font-size: 12px;
}

</style>
