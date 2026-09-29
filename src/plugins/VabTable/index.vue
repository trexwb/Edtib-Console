<!--
 * @Author: trexwb
 * @Date: 2025-03-25 17:19:52
 * @LastEditors: trexwb
 * @LastEditTime: 2025-04-01 18:05:25
 * @FilePath: /client/console/src/plugins/VabTable/index.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-table ref="tableSortRef" v-loading="state.loading" :border="true" :data="rows.list" :stripe="true"
    @selection-change="setSelectRows" @sort-change="handleSortChange">
    <el-table-column type="selection" width="38" />
    <el-table-column v-for="(item, index) in finallyColumns" :key="index" align="center" :label="item.label"
      :prop="item.prop" show-overflow-tooltip :sortable="item.sortable" :width="item.width">
      <template #default="{ row }">
        <template v-if="item.prop === 'names'">
          <div style="text-align: left;">{{ Object.values(row.names).join('|') }}</div>
        </template>
        <div v-if="item.prop === 'covers'"
          style="z-index: 999999; display: flex; align-items: center; box-align: center">
          <el-image v-if="row.covers && row.covers.length > 0" :src="`${row.covers[0]?.url}!a50`"
            @click="state.srcList = row.covers.map((element: any) => element.url); state.showPreview = true" />
          <el-text v-else class="mx-1" type="info">无</el-text>
        </div>
        <template v-if="item.prop === 'status'">
          <el-tag v-if="row.status === 0" type="info">禁用</el-tag>
          <el-tag v-if="row.status === 1" type="success">启用</el-tag>
        </template>
        <template v-if="item.prop === 'sort'">
          <span class="sort" v-show="!(canInputEdits == row?.id)" @click="editInputItem(row?.id)">
            {{ row?.sort || 0 }}
          </span>
          <el-input v-show="canInputEdits == row.id" :id="'input' + row.id" v-model.trim="row.sort"
            @blur="handleSort(row?.sort, row?.id)" maxlength="5"
            :formatter="(value: string) => value.replace(/\D/g, '')"
            :parser="(value: string) => value.replace(/\D/g, '')" :ref="setInputRef(row.id)"
            placeholder="按自然排序从小到大，但是0永远在最后" />
        </template>
      </template>
    </el-table-column>
    <el-table-column align="center" :fixed="state.operationFixed ? 'right' : false" label="操作" width="100">
      <template #header>
        <el-checkbox v-model="state.operationFixed" label="固定" size="large" value="固定" />
      </template>
      <template #default="{ row }">
        <el-button v-permissions="{ permission: ['standardsStandards:read'] }" :icon="View" text type="primary"
          @click="handleView(row)" />
        <el-button v-permissions="{ permission: ['standardsStandards:write'] }" :icon="Edit" text type="success"
          @click="handleEdit(row)" />
        <el-button v-permissions="{ permission: ['standardsStandards:delete'] }" :icon="Delete" text type="danger"
          @click="handleDelete(row)" />
      </template>
    </el-table-column>
    <template #empty>
      <el-empty class="vab-data-empty" description="暂无数据" />
    </template>
  </el-table>
  <el-pagination background :current-page="queryForm.page" :layout="layout" :page-size="queryForm.pageSize"
    :total="rows.total" @current-change="handleCurrentChange" @size-change="handleSizeChange" />
  <el-image-viewer v-if="state.showPreview" :url-list="state.srcList" show-progress :initial-index="0"
    @close="state.showPreview = false" />
</template>

<script lang="ts" setup>
import VabDraggable from 'vuedraggable'
import { Delete, Edit, View } from '@element-plus/icons-vue'
import { getStorage, setStorage } from '/@/utils/storage'
import { ElMessage, ElMessageBox } from 'element-plus'

defineOptions({
  name: 'VabTable',
})

interface Column {
  label: string
  prop: string
  sortable?: boolean
  width?: string | number
  disableCheck?: boolean
}

const props = defineProps({
  queryForm: {
    type: Object as PropType<{ page: number; pageSize: number }>,
    default() {
      return {
        page: 1,
        pageSize: 10,
      }
    }
  },
  rows: {
    type: Object as PropType<{ total: number; list: any[] }>,
    default() {
      return {
        total: 0,
        list: []
      }
    }
  },
  finallyColumns: {
    type: Array as PropType<Column[]>,
    default() {
      return []
    }
  }
})

const emit = defineEmits(['fetchData', 'handleSort', 'showView', 'showEdit', 'handleDelete'])

const layout = ref('sizes, prev, pager, next, jumper, total')

const state = reactive({
  operationFixed: true,
  selectionRows: [],
  loading: false,
  showPreview: false,
  srcList: []
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

const handleSort = (sort: any, id: any) => {
  emit('handleSort', sort, id)
}

const setSelectRows = (selection: any) => {
  state.selectionRows = selection.map((element: any) => element.id as number)
}

const handleSizeChange = (value: number) => {
  props.queryForm.page = 1
  props.queryForm.pageSize = value
  setStorage('pageSize', props.queryForm.pageSize)
  emit('fetchData')
}

const handleCurrentChange = (value: number) => {
  props.queryForm.page = value
  emit('fetchData')
}

const handleSortChange = (column: any) => {
  const sort = `${column.order === 'descending' ? '-' : '+'}${column.prop}`
  emit('fetchData', sort)
}

const handleView = (row: any = {}) => {
  emit('showView', row)
}

const handleEdit = (row: any = {}) => {
  emit('showEdit', row)
}

const handleDelete = (row: any = {}) => {
  if (!row) {
    if (state.selectionRows.length === 0) {
      ElMessage({
        message: '请选择需要删除的数据',
        type: 'error',
      })
      return
    }
  }
  ElMessageBox.confirm('您确定要删除选中项吗？', '提示', {
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
      await emit('handleDelete', row)
      ElMessage({
        message: '删除成功',
        type: 'success',
      })
      state.loading = false
      emit('fetchData')
    })
    .catch((err) => {
      console.log(err)
    })
}

const init = () => {
  // if (props.config.url && props.config.url !== '') {
  //   player.value = new Player(props.config)
  //   emit('player', player.value)
  // }
}

onMounted(() => {
  init()
})

onBeforeMount(() => {

})
</script>
