<!--
 * @Author: trexwb
 * @Date: 2025-03-25 11:42:30
 * @LastEditors: trexwb
 * @LastEditTime: 2025-04-02 14:33:03
 * @FilePath: /client/console/src/views/customers/open/users.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <vab-query-form v-permissions="{ permission: ['customersUsers:read'] }">
      <vab-query-form-top-panel>
        <el-form :inline="true" label-width="80px" :model="queryForm" @submit.prevent>
          <el-form-item :label="translate('模糊搜索')">
            <el-input v-model="queryForm.filter.keywords" clearable :placeholder="translate('请输入关键字模糊搜索')" @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" label="ID" label-width="40px">
            <el-input v-model.trim="queryForm.filter.id" clearable :placeholder="translate('请输入ID搜索')" @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('昵称')" label-width="60px">
            <el-input v-model.trim="queryForm.filter.nickname" clearable :placeholder="translate('请输入昵称搜索')" @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('真实姓名')" label-width="100px">
            <el-input v-model="queryForm.filter.truename" clearable :placeholder="translate('请输入真实姓名搜索')" @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('邮箱')" label-width="60px">
            <el-input v-model.trim="queryForm.filter.email" clearable :placeholder="translate('请输入邮箱搜索')" @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('手机号')" label-width="80px">
            <el-input v-model.trim="queryForm.filter.mobile" clearable :placeholder="translate('请输入手机号搜索')" @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" label="UUID" label-width="60px">
            <el-input v-model.trim="queryForm.filter.uuid" clearable :placeholder="translate('请输入UUID搜索')" @keyup.enter="queryData" />
          </el-form-item>
          <el-form-item v-show="!state.fold" :label="translate('状态')" label-width="60px" style="width: 240px">
            <el-select v-model="queryForm.filter.status" clearable :placeholder="translate('请选择状态')">
              <el-option :label="translate('全部')" value="" />
              <el-option :label="translate('草稿')" :value="`0`" />
              <el-option :label="translate('通过')" :value="`1`" />
              <el-option :label="translate('待核')" :value="`2`" />
              <el-option :label="translate('驳回')" :value="`3`" />
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
        <el-menu default-active="all" mode="horizontal" class="custom-menu" :ellipsis="false" @select="handleTabs">
          <el-menu-item index="all">{{ translate('全部') }}</el-menu-item>
          <el-menu-item index="draft">{{ translate('草稿') }}</el-menu-item>
          <el-menu-item index="wait">{{ translate('待审') }}</el-menu-item>
          <el-menu-item index="pass">{{ translate('通过') }}</el-menu-item>
          <el-menu-item index="refuse">{{ translate('驳回') }}</el-menu-item>
        </el-menu>
        <el-button
          v-permissions="{ permission: ['customersUsers:write'] }"
          :disabled="state.selectionRows.length === 0"
          :icon="Select"
          type="success"
          @click="handleBatchPass"
        >
          {{ translate('批量审核通过') }}
        </el-button>
        <el-button
          v-permissions="{ permission: ['customersUsers:write'] }"
          :disabled="state.selectionRows.length === 0"
          :icon="CloseBold"
          type="danger"
          @click="handleBatchRefuse"
        >
          {{ translate('批量驳回') }}
        </el-button>
      </vab-query-form-left-panel>
      <vab-query-form-right-panel>
        <el-button v-permissions="{ permission: ['customersUsers:write'] }" :icon="Plus" type="primary"
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
          <div v-if="item.prop === 'avatar'">
            <el-avatar :size="50" :src="`${row.avatar}!a50`">
              <img src="/@/assets/avatar.svg" alt="Default Avatar" />
            </el-avatar>
          </div>
          <div v-if="item.prop === 'manager'">
            <el-text class="mx-1" type="primary">{{ row.manager ? row.manager.truename : translate('运维管理员') }}</el-text>
          </div>
          <template v-if="item.prop === 'status'">
            <el-tag v-if="row.status === 0" type="info">{{ translate('草稿') }}</el-tag>
            <el-tag v-if="row.status === 1" type="success">{{ translate('正常') }}</el-tag>
            <el-tag v-if="row.status === 2" type="primary">{{ translate('待审') }}</el-tag>
            <el-tag v-if="row.status === 3" type="danger">{{ translate('驳回') }}</el-tag>
          </template>
        </template>
      </el-table-column>
      <el-table-column align="center" :fixed="state.operationFixed ? 'right' : false" :label="translate('操作')" width="100">
        <template #header>
          <el-checkbox v-model="state.operationFixed" :label="translate('固定')" size="large" :value="translate('固定')" />
        </template>
        <template #default="{ row }">
          <el-tooltip :content="translate('预览')" placement="bottom">
            <el-button v-permissions="{ permission: ['customersUsers:read'] }" :icon="View" text type="primary"
              @click="handleView(row)" />
          </el-tooltip>
          <el-tooltip v-if="row.status === 0 || row.status === 3" :content="translate('修改')" placement="bottom">
            <el-button v-if="row.status === 0 || row.status === 3"
              v-permissions="{ permission: ['customersUsers:write'] }" :icon="Edit" text type="success"
              @click="handleEdit(row)" />
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
    <customers-users-edit ref="editRef" @fetch-data="fetchData" @handle-edit="handleEdit" />
    <customers-users-view ref="viewRef" @handle-edit="handleEdit" />
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { useAclStore } from '/@/store/modules/acl'
import VabDraggable from 'vuedraggable'
import { CloseBold, Edit, Plus, Refresh, Search, Select, View } from '@element-plus/icons-vue'
import { usersList, usersReviewSave } from '/@/api/customers'
import { getStorage, setStorage } from '/@/utils/storage'
import { ElMessage, ElMessageBox } from 'element-plus'

const templateName = 'CustomersOpenUsers'
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
  loading: false
})

const queryForm = reactive({
  filter: {
    keywords: '',
    nickname: '',
    truename: '',
    email: '',
    mobile: '',
    uuid: '',
    manager: '',
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
    label: translate('昵称'),
    prop: 'nickname',
    sortable: true,
    disableCheck: true,
  },
  {
    label: translate('真实姓名'),
    prop: 'truename',
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('邮箱'),
    prop: 'email',
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('手机'),
    prop: 'mobile',
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('头像'),
    prop: 'avatar',
    sortable: false,
    disableCheck: false,
  },
  {
    label: 'UUID',
    prop: 'uuid',
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('经办人'),
    prop: 'manager',
    sortable: true,
    disableCheck: false,
  },
  {
    label: translate('有效期'),
    prop: 'times_expire',
    width: 180,
    sortable: true,
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
const checkList = ref<any>(myCheckList[templateName] || ['id', 'nickname', 'truename', 'times_expire', 'created_at', 'status'])
const finallyColumns = computed(() => {
  return columns.value.filter((item: any) => checkList.value.includes(item.prop))
})

const setSelectRows = (selection: any) => {
  state.selectionRows = selection.map((element: any) => element.id as number)
}

// 批量审核通过
const handleBatchPass = () => {
  if (state.selectionRows.length === 0) {
    ElMessage({
      message: translate('请选择需要审核的数据'),
      type: 'error',
    })
    return
  }
  ElMessageBox.confirm(translate('审核通过后数据将显示在前台！'), translate('提示'), {
    draggable: true,
    type: 'warning',
  })
    .then(async () => {
      const rowIds = state.selectionRows as number[]
      state.loading = true
      for (const id of rowIds) {
        await usersReviewSave({ id, status: 1 })
      }
      ElMessage({
        message: translate('审核通过'),
        type: 'success',
      })
      state.loading = false
      fetchData()
    })
    .catch((err) => {
      console.log(err)
    })
}

// 批量驳回
const handleBatchRefuse = () => {
  if (state.selectionRows.length === 0) {
    ElMessage({
      message: translate('请选择需要驳回的数据'),
      type: 'error',
    })
    return
  }
  ElMessageBox.prompt(translate('请填写拒绝原因，方便经办人调整！'), translate('拒绝原因'), {
    confirmButtonText: 'OK',
    cancelButtonText: 'Cancel',
    inputValidator: (value) => {
      if (!value || value.trim() === '') {
        return translate('拒绝原因不能为空')
      }
      return true
    },
  })
    .then(async ({ value }) => {
      const rowIds = state.selectionRows as number[]
      state.loading = true
      for (const id of rowIds) {
        await usersReviewSave({ id, status: 3, remark: value })
      }
      ElMessage({
        message: translate('驳回成功'),
        type: 'success',
      })
      state.loading = false
      fetchData()
    })
    .catch((err) => {
      console.log(err)
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

const handleView = (row: any = {}) => {
  viewRef.value.showView(row)
}

const fetchData = async () => {
  try {
    if (state.loading) return
    state.loading = true
    const { data }: any = await usersList(queryForm)
    rows.list = data?.list || []
    rows.total = data?.total || 0
    state.loading = false
  } catch (error) {
    console.error('Fetch data error:', error)
    // 可以加入错误处理逻辑，如显示错误信息
  }
}

const handleTabs = (key: string, keyPath: string[]) => {
  const STATUS_MAP: Record<string, string> = {
    all: '',
    draft: '0',
    wait: '2',
    pass: '1',
    refuse: '3'
  } as const
  queryForm.filter.status = STATUS_MAP[key || 'all'] ?? ''
  queryForm.page = 1
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
  queryForm.filter.nickname = ''
  queryForm.filter.truename = ''
  queryForm.filter.email = ''
  queryForm.filter.mobile = ''
  queryForm.filter.uuid = ''
  queryForm.filter.manager = ''
  queryForm.filter.id = ''
  queryForm.filter.status = ''
  queryForm.page = 1
  queryData()
}

const init = () => {
  fetchData()
}

/* 生命周期钩子 */
onMounted(() => {  })
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

.el-menu--horizontal:focus,
.el-menu--horizontal:hover {
  background-color: #fff !important;
}

.el-menu-item:not(.is-disabled):focus,
.el-menu-item:not(.is-disabled):hover {
  background-color: #fff !important;
}
</style>