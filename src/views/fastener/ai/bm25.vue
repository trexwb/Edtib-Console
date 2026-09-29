<!--
 * @Author: trexwb
 * @Date: 2026-09-10
 * @FilePath: /console/web/src/views/fastener/ai/bm25.vue
 * @Description: BM25 索引运维（Fastener AI 运维）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <vab-query-form v-permissions="{ permission: ['fastenerAi:read'] }">
      <vab-query-form-top-panel>
        <el-form :inline="true" label-width="80px" :model="queryForm" @submit.prevent>
          <el-form-item :label="translate('来源类型')">
            <el-select v-model="queryForm.sourceType" clearable :placeholder="translate('请选择来源类型')">
              <el-option :label="translate('全部')" value="" />
              <el-option :label="translate('产品标准')" value="1" />
              <el-option :label="translate('解读')" value="2" />
              <el-option :label="translate('知识库文档')" value="3" />
            </el-select>
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('来源ID')">
            <el-input v-model.trim="queryForm.sourceId" clearable :placeholder="translate('请输入来源ID')"
              @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('访问级别')">
            <el-select v-model="queryForm.accessLevel" clearable :placeholder="translate('请选择访问级别')">
              <el-option :label="translate('全部')" value="" />
              <el-option :label="translate('免费')" value="0" />
              <el-option :label="translate('订阅')" value="1" />
              <el-option :label="translate('已购')" value="2" />
            </el-select>
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('状态')">
            <el-select v-model="queryForm.status" clearable :placeholder="translate('请选择状态')">
              <el-option :label="translate('全部')" value="" />
              <el-option :label="translate('启用')" value="1" />
              <el-option :label="translate('禁用')" value="0" />
            </el-select>
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('关键词')">
            <el-input v-model.trim="queryForm.keyword" clearable :placeholder="translate('关键词或正文')"
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
      <vab-query-form-left-panel>
        <el-button
          v-permissions="{ permission: ['fastenerAi:read'] }"
          :disabled="state.selectionRows.length === 0"
          :icon="Download"
          type="primary"
          @click="handleBatchExport"
        >
          {{ translate('批量导出') }}
        </el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel>
        <el-tooltip
          :content="translate('重建将重新生成索引块（上传文件索引保留不清空），耗时较长，请谨慎操作')" placement="top">
          <el-button v-permissions="{ permission: ['fastenerAi:write'] }" :icon="RefreshRight"
            :loading="state.rebuilding" type="danger" @click="handleRebuild">{{ translate('重建BM25索引') }}</el-button>
        </el-tooltip>
        <el-button @click="fetchAll">
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

    <el-row :gutter="20">
      <el-col v-for="card in overviewCards" :key="card.key" :lg="6" :md="8" :sm="12" :xs="24">
        <el-card class="overview-card" shadow="hover">
          <div class="overview-label">
            <vab-icon :icon="card.icon" />
            {{ card.label }}
          </div>
          <div class="overview-value">{{ card.value }}</div>
        </el-card>
      </el-col>
      <el-col v-if="overviewCards.length === 0" :span="24">
        <el-card class="overview-card" shadow="never">
          <el-empty class="vab-data-empty" :description="translate('暂无数据')" />
        </el-card>
      </el-col>
    </el-row>

    <el-table v-loading="state.loading" :border="true" :data="rows.list" :stripe="true" @selection-change="setSelectRows">
      <el-table-column type="selection" width="38" />
      <el-table-column v-for="(item, index) in finallyColumns" :key="index" align="center" :label="item.label"
        :prop="item.prop" show-overflow-tooltip :width="item.width" :min-width="item.minWidth">
        <template v-if="item.prop === 'sourceType'" #default="{ row }">{{ sourceTypeText(row.sourceType) }}</template>
        <template v-else-if="item.prop === 'accessLevel'" #default="{ row }">{{ accessLevelText(row.accessLevel) }}</template>
        <template v-else-if="item.prop === 'status'" #default="{ row }">
          <el-tag v-if="row.status === 1" type="success">{{ translate('启用') }}</el-tag>
          <el-tag v-else type="info">{{ translate('禁用') }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column align="center" fixed="right" :label="translate('操作')" width="80">
        <template #default="{ row }">
          <el-tooltip :content="translate('查看')" placement="bottom">
            <el-button v-permissions="{ permission: ['fastenerAi:read'] }" :icon="View" text type="primary"
              @click="handleView(row)" />
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
    <bm25-block-view ref="viewRef" />
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Download, Refresh, RefreshRight, Search, View } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { fastenerAiBlocksList, fastenerAiRebuildBm25, fastenerAiStats } from '/@/api/fastenerAi'
import { getStorage, setStorage } from '/@/utils/storage'
import VabDraggable from 'vuedraggable'
import { ElMessage, ElMessageBox } from 'element-plus'

const templateName = 'FastenerAiBm25'
defineOptions({
  name: templateName,
})

const layout = ref('sizes, prev, pager, next, jumper, total')
const viewRef = ref<any>(null)

const state = reactive({
  fold: true,
  loading: false,
  rebuilding: false,
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
  sourceType: '',
  sourceId: '',
  accessLevel: '',
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
    label: translate('来源类型'),
    prop: 'sourceType',
    width: 120,
    disableCheck: false,
  },
  {
    label: translate('来源ID'),
    prop: 'sourceId',
    width: 110,
    disableCheck: false,
  },
  {
    label: translate('块序号'),
    prop: 'chunkNo',
    width: 90,
    disableCheck: false,
  },
  {
    label: translate('标题'),
    prop: 'title',
    minWidth: 180,
    disableCheck: false,
  },
  {
    label: translate('访问级别'),
    prop: 'accessLevel',
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
const checkList = ref<any>(myCheckList[templateName] || ['id', 'sourceType', 'sourceId', 'chunkNo', 'title', 'accessLevel', 'status', 'createdAt'])
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

const stats = ref<any>({})

const SOURCE_TYPE_MAP: Record<number, string> = {
  1: '产品标准',
  2: '解读',
  3: '知识库文档',
  4: '上传文件',
}

const ACCESS_LEVEL_MAP: Record<number, string> = {
  0: '免费',
  1: '订阅',
  2: '已购',
}

const sourceTypeText = (sourceType: number) => {
  const label = SOURCE_TYPE_MAP[Number(sourceType)]
  return label ? translate(label) : translate('未知')
}

const accessLevelText = (accessLevel: number) => {
  const label = ACCESS_LEVEL_MAP[Number(accessLevel)]
  return label ? translate(label) : translate('未知')
}

/* 概览卡片：总块数 + 按源类型/访问级别分组（按块数降序） */
const overviewCards = computed(() => {
  const cards = [
    {
      key: 'total',
      label: translate('索引块总数'),
      icon: 'database-2-line',
      value: stats.value?.total || 0,
    },
  ]
  const groups = [...(stats.value?.by_source || [])].sort(
    (a: any, b: any) => Number(groupBlocks(b)) - Number(groupBlocks(a))
  )
  groups.forEach((item: any, index: number) => {
    cards.push({
      key: `group_${index}`,
      label: `${sourceTypeText(groupSourceType(item))} · ${accessLevelText(groupAccessLevel(item))}`,
      icon: 'file-list-3-line',
      value: groupBlocks(item),
    })
  })
  return cards
})

function groupSourceType(item: any = {}) {
  return item.source_type ?? item.sourceType
}

function groupAccessLevel(item: any = {}) {
  return item.access_level ?? item.accessLevel
}

function groupBlocks(item: any = {}) {
  return item.blocks ?? item.total ?? item.count ?? 0
}

const fetchStats = async () => {
  try {
    const res: any = await fastenerAiStats()
    stats.value = res?.data || {}
  } catch (error) {
    console.error('Fetch bm25 stats error:', error)
  }
}

const fetchData = async () => {
  try {
    if (state.loading) return
    state.loading = true
    const res: any = await fastenerAiBlocksList({
      sourceType: queryForm.sourceType,
      sourceId: queryForm.sourceId,
      accessLevel: queryForm.accessLevel,
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
    console.error('Fetch bm25 blocks error:', error)
  }
}

const fetchAll = () => {
  fetchStats()
  fetchData()
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
  queryForm.sourceType = ''
  queryForm.sourceId = ''
  queryForm.accessLevel = ''
  queryForm.status = ''
  queryForm.keyword = ''
  queryData()
}

const handleView = (row: any = {}) => {
  viewRef.value.showView(row)
}

/* 全量重建：清空并重建索引块，属高频 IO 操作，需二次确认 */
const handleRebuild = () => {
  ElMessageBox.confirm(
    translate('该操作将清空全部索引块并按最新知识重建，期间知识检索结果可能不完整，是否继续？'),
    translate('重建BM25索引'),
    { draggable: true, type: 'warning', confirmButtonText: translate('确认'), cancelButtonText: translate('取消') }
  )
    .then(async () => {
      state.rebuilding = true
      try {
        const res: any = await fastenerAiRebuildBm25()
        ElMessage({
          message: translate(res?.data?.message || '已触发重建'),
          type: 'success',
        })
      } catch (error) {
        console.error('Rebuild bm25 error:', error)
      }
      state.rebuilding = false
      fetchAll()
    })
    .catch((err) => {
      console.log(err)
    })
}

const init = () => {
  fetchAll()
}

/* 生命周期钩子 */
onMounted(() => { /* 组件挂载后逻辑 */ })
onBeforeUnmount(() => { /* 组件卸载前清理逻辑 */ })
onBeforeMount(() => {
  init()
})
</script>

<style lang="scss" scoped>
.overview-card {
  margin-bottom: 20px;

  .overview-label {
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }

  .overview-value {
    margin-top: 8px;
    font-size: 22px;
    font-weight: 600;
  }
}
</style>
