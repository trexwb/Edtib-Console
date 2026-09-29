<!--
 * @Author: trexwb
 * @Date: 2026-09-10
 * @FilePath: /console/web/src/views/fastener/ai/sessions.vue
 * @Description: AI 会话管理（Fastener AI 运维）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <vab-query-form v-permissions="{ permission: ['fastenerAi:read'] }">
      <vab-query-form-top-panel>
        <el-form :inline="true" label-width="80px" :model="queryForm" @submit.prevent>
          <el-form-item :label="translate('客户')">
            <el-input v-model.trim="queryForm.customerId" clearable :placeholder="translate('客户ID/手机号/邮箱/昵称')"
              @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('状态')">
            <el-select v-model="queryForm.status" clearable :placeholder="translate('请选择状态')">
              <el-option :label="translate('全部')" value="" />
              <el-option :label="translate('启用')" value="1" />
              <el-option :label="translate('禁用')" value="0" />
            </el-select>
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('关键词')">
            <el-input v-model.trim="queryForm.keyword" clearable :placeholder="translate('标题或模型')"
              @keyup.enter="queryData" />
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
      <vab-query-form-right-panel :span="24">
        <el-button v-permissions="{ permission: ['fastenerAi:write'] }" :disabled="state.selectionRows.length === 0"
          :icon="Hide" type="warning" @click="handleStatus(null, 0)">{{ translate('批量禁用') }}</el-button>
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
    <el-table v-loading="state.loading" :border="true" :data="rows.list" :stripe="true"
      @selection-change="setSelectRows">
      <el-table-column type="selection" width="38" />
      <el-table-column v-for="(item, index) in finallyColumns" :key="index" align="center" :label="item.label"
        :prop="item.prop" show-overflow-tooltip :width="item.width" :min-width="item.minWidth">
        <template v-if="item.prop === 'customer'" #default="{ row }">
          <div>{{ row.customer?.nickname || row.customer?.truename || '-' }}</div>
          <div style="color: var(--el-text-color-secondary); font-size: 12px">
            {{ row.customer?.mobile || row.customer?.email || '' }}
          </div>
        </template>
        <template v-else-if="item.prop === 'status'" #default="{ row }">
          <el-tag v-if="row.status === 1" type="success">{{ translate('启用') }}</el-tag>
          <el-tag v-else type="info">{{ translate('禁用') }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column align="center" fixed="right" :label="translate('操作')" width="120">
        <template #default="{ row }">
          <el-tooltip :content="translate('查看')" placement="bottom">
            <el-button v-permissions="{ permission: ['fastenerAi:read'] }" :icon="View" text type="primary"
              @click="handleView(row)" />
          </el-tooltip>
          <el-tooltip v-if="row.status === 1" :content="translate('禁用')" placement="bottom">
            <el-button v-permissions="{ permission: ['fastenerAi:write'] }" :icon="Hide" text type="danger"
              @click="handleStatus(row, 0)" />
          </el-tooltip>
          <el-tooltip v-else :content="translate('启用')" placement="bottom">
            <el-button v-permissions="{ permission: ['fastenerAi:write'] }" :icon="Select" text type="success"
              @click="handleStatus(row, 1)" />
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
    <ai-session-detail ref="viewRef" />
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Hide, Refresh, Search, Select, View } from '@element-plus/icons-vue'
import { fastenerAiSessionDisable, fastenerAiSessionsList } from '/@/api/fastenerAi'
import { getStorage, setStorage } from '/@/utils/storage'
import VabDraggable from 'vuedraggable'
import { ElMessage, ElMessageBox } from 'element-plus'

const templateName = 'FastenerAiSessions'
defineOptions({
  name: templateName,
})

const layout = ref('sizes, prev, pager, next, jumper, total')
const viewRef = ref<any>(null)

const state = reactive({
  selectionRows: [] as number[],
  fold: true,
  loading: false,
})

/* 查询区折叠：收起时仅保留首个筛选项 */
const handleFold = () => {
  state.fold = !state.fold
}

const queryForm = reactive({
  customerId: '',
  status: '',
  keyword: '',
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
    label: translate('客户'),
    prop: 'customer',
    width: 170,
    disableCheck: true,
  },
  {
    label: translate('标题'),
    prop: 'title',
    disableCheck: false,
  },
  {
    label: translate('模型'),
    prop: 'model',
    width: 180,
    disableCheck: false,
  },
  {
    label: translate('消息数'),
    prop: 'messageCount',
    width: 90,
    disableCheck: false,
  },
  {
    label: translate('最后消息时间'),
    prop: 'lastMessageAt',
    width: 180,
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
const checkList = ref<any>(myCheckList[templateName] || ['id', 'customer', 'title', 'model', 'messageCount', 'lastMessageAt', 'status', 'createdAt'])
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

const setSelectRows = (selection: any[]) => {
  state.selectionRows = selection.map((element: any) => element.id as number)
}

const fetchData = async () => {
  try {
    if (state.loading) return
    state.loading = true
    const res: any = await fastenerAiSessionsList({
      customerId: queryForm.customerId,
      status: queryForm.status,
      keyword: queryForm.keyword,
      page: queryForm.page,
      pageSize: queryForm.pageSize,
    })
    const payload = res?.data || {}
    rows.list = payload.data || []
    rows.total = payload.meta?.total || 0
    state.loading = false
  } catch (error) {
    state.loading = false
    console.error('Fetch sessions error:', error)
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

const handleView = (row: any = {}) => {
  viewRef.value.showView(row)
}

/* 启用 / 禁用（row 为空时按批量选中项处理） */
const handleStatus = (row: any = null, status = 0) => {
  const ids: number[] = row ? [row.id] : [...state.selectionRows]
  if (ids.length === 0) {
    ElMessage({
      message: status === 1 ? translate('请选择需要启用的数据') : translate('请选择需要禁用的数据'),
      type: 'error',
    })
    return
  }
  ElMessageBox.confirm(
    status === 1 ? translate('您确定要启用选中项吗？') : translate('您确定要禁用选中项吗？'),
    translate('提示'),
    { draggable: true, type: 'warning' }
  )
    .then(async () => {
      state.loading = true
      await fastenerAiSessionDisable({ ids, status })
      ElMessage({
        message: status === 1 ? translate('启用成功') : translate('禁用成功'),
        type: 'success',
      })
      state.loading = false
      fetchData()
    })
    .catch((err) => {
      console.log(err)
    })
}

// 重置查询条件
const handleReset = () => {
  queryForm.customerId = ''
  queryForm.status = ''
  queryForm.keyword = ''
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
