<!--
 * @Author: trexwb
 * @Date: 2026-09-11
 * @FilePath: /console/web/src/views/fastener/commerce/subscriptionPlans.vue
 * @Description: 订阅计划管理（查询 + 新建/编辑 + 启停 + 删除；价格单位分、时长天、赠送积分）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <vab-query-form v-permissions="{ permission: ['fastenerCommerceSubscriptionPlans:read'] }">
      <vab-query-form-top-panel>
        <el-form :inline="true" label-width="80px" :model="queryForm" @submit.prevent>
          <el-form-item :label="translate('计划名称')">
            <el-input v-model.trim="queryForm.keyword" clearable :placeholder="translate('请输入计划名称')"
              @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item :label="translate('状态')">
            <el-select v-model="queryForm.status" clearable :placeholder="translate('请选择状态')">
              <el-option :label="translate('全部')" value="" />
              <el-option :label="translate('启用')" value="1" />
              <el-option :label="translate('停用')" value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button :icon="Search" :loading="state.loading" native-type="submit" type="primary"
              @click="queryData">{{ translate('查询') }}</el-button>
            <el-button :icon="Refresh" @click="handleReset">{{ translate('重置') }}</el-button>
          </el-form-item>
        </el-form>
      </vab-query-form-top-panel>
      <vab-query-form-left-panel>
        <el-button
          v-permissions="{ permission: ['fastenerCommerceSubscriptionPlans:read'] }"
          :disabled="state.selectionRows.length === 0"
          :icon="Download"
          type="primary"
          @click="handleBatchExport"
        >
          {{ translate('批量导出') }}
        </el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel>
        <el-button v-permissions="{ permission: ['fastenerCommerceSubscriptionPlans:write'] }" :icon="Plus" type="primary"
          @click="handleCreate">{{ translate('新建计划') }}</el-button>
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
        <template v-if="item.prop === 'price'" #default="{ row }">{{ (Number(row.price || 0) / 100).toFixed(2) }}</template>
        <template v-else-if="item.prop === 'originalPrice'" #default="{ row }">
          {{ row.originalPrice === null || row.originalPrice === undefined ? '-' : (Number(row.originalPrice) / 100).toFixed(2) }}
        </template>
        <template v-else-if="item.prop === 'status'" #default="{ row }">
          <el-tag :type="Number(row.status) === 1 ? 'success' : 'info'">
            {{ translate(Number(row.status) === 1 ? '启用' : '停用') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column align="center" fixed="right" :label="translate('操作')" width="160">
        <template #default="{ row }">
          <el-tooltip :content="translate('编辑')" placement="bottom">
            <el-button v-permissions="{ permission: ['fastenerCommerceSubscriptionPlans:write'] }" :icon="Edit" text type="primary"
              @click="handleEdit(row)" />
          </el-tooltip>
          <el-tooltip :content="translate(Number(row.status) === 1 ? '停用' : '启用')" placement="bottom">
            <el-button v-permissions="{ permission: ['fastenerCommerceSubscriptionPlans:write'] }"
              :icon="Number(row.status) === 1 ? CircleClose : Select" text
              :type="Number(row.status) === 1 ? 'warning' : 'success'" @click="handleToggle(row)" />
          </el-tooltip>
          <el-tooltip :content="translate('删除')" placement="bottom">
            <el-button v-permissions="{ permission: ['fastenerCommerceSubscriptionPlans:delete'] }" :icon="Delete" text type="danger"
              @click="handleDelete(row)" />
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
    <plan-edit ref="editRef" @success="fetchData" />
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { CircleClose, Delete, Download, Edit, Plus, Refresh, Search, Select } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import {
  fastenerCommerceSubscriptionPlanDelete,
  fastenerCommerceSubscriptionPlanToggle,
  fastenerCommerceSubscriptionPlans,
} from '/@/api/fastenerCommerce'
import { getStorage, setStorage } from '/@/utils/storage'
import VabDraggable from 'vuedraggable'
import { ElMessage, ElMessageBox } from 'element-plus'
import PlanEdit from './vabAutoComponents/SubscriptionPlanEdit.vue'

const templateName = 'FastenerCommerceSubscriptionPlans'
defineOptions({
  name: templateName,
})

const layout = ref('sizes, prev, pager, next, jumper, total')
const editRef = ref<any>(null)

const state = reactive({
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

const queryForm = reactive({
  keyword: '',
  status: '',
  page: 1,
  pageSize: Number(getStorage('pageSize') || 20),
})

/* 列显示控制：与临时标准库 temp.vue 保持同一范式 */
const columns = ref<any>([
  {
    label: translate('编号'),
    prop: 'id',
    width: 80,
    disableCheck: true,
  },
  {
    label: translate('计划名称'),
    prop: 'planName',
    minWidth: 180,
    disableCheck: true,
  },
  {
    label: translate('价格(元)'),
    prop: 'price',
    width: 110,
    disableCheck: false,
  },
  {
    label: translate('原价(元)'),
    prop: 'originalPrice',
    width: 110,
    disableCheck: false,
  },
  {
    label: translate('时长(天)'),
    prop: 'durationDays',
    width: 100,
    disableCheck: false,
  },
  {
    label: translate('赠送积分'),
    prop: 'giftCredits',
    width: 100,
    disableCheck: false,
  },
  {
    label: translate('排序'),
    prop: 'sort',
    width: 80,
    disableCheck: false,
  },
  {
    label: translate('生效中订阅'),
    prop: 'activeSubscribers',
    width: 110,
    disableCheck: false,
  },
  {
    label: translate('状态'),
    prop: 'status',
    width: 90,
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
const checkList = ref<any>(myCheckList[templateName] || ['id', 'planName', 'price', 'originalPrice', 'durationDays', 'giftCredits', 'sort', 'activeSubscribers', 'status', 'createdAt'])
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

const fetchData = async () => {
  try {
    if (state.loading) return
    state.loading = true
    const res: any = await fastenerCommerceSubscriptionPlans({
      keyword: queryForm.keyword,
      status: queryForm.status,
      page: queryForm.page,
      pageSize: queryForm.pageSize,
    })
    const payload = res?.data || {}
    // 后端返回字段为下划线风格（plan_name / active_subscribers），此处统一映射为表格展示字段
    rows.list = (payload.data || []).map((row: any) => ({
      ...row,
      planName: row.plan_name || row.planName || '',
      activeSubscribers: row.active_subscribers ?? row.activeSubscribers ?? 0,
    }))
    rows.total = payload.meta?.total || 0
    state.loading = false
  } catch (error) {
    state.loading = false
    console.error('Fetch subscription plans error:', error)
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

const handleCreate = () => {
  editRef.value.showEdit(null)
}

const handleEdit = (row: any) => {
  editRef.value.showEdit(row)
}

const handleToggle = (row: any) => {
  const next = Number(row.status) === 1 ? 0 : 1
  ElMessageBox.confirm(
    translate(next === 1 ? '启用后该计划将在前台展示并允许购买，确定启用吗？' : '停用后前台不再展示该计划，存量订阅不受影响。确定停用吗？'),
    translate('提示'),
    { draggable: true, type: 'warning' }
  )
    .then(async () => {
      state.loading = true
      await fastenerCommerceSubscriptionPlanToggle(row.id, next)
      ElMessage({ message: translate('操作成功'), type: 'success' })
      state.loading = false
      fetchData()
    })
    .catch((err) => {
      console.log(err)
    })
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(
    translate('删除后该计划不再出现在后台列表；存在生效中订阅记录时后端会拒绝删除。确定删除吗？'),
    translate('提示'),
    { draggable: true, type: 'warning' }
  )
    .then(async () => {
      state.loading = true
      await fastenerCommerceSubscriptionPlanDelete({ id: row.id })
      ElMessage({ message: translate('删除成功'), type: 'success' })
      state.loading = false
      fetchData()
    })
    .catch((err) => {
      console.log(err)
    })
}

const handleReset = () => {
  queryForm.keyword = ''
  queryForm.status = ''
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
