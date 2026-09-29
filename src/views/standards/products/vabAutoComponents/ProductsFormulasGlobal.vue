<!--
 * @Author: 编程专家
 * @Date: 2026-09-08
 * @FilePath: /console/web/src/views/standards/products/vabAutoComponents/ProductsFormulasGlobal.vue
 * @Description: 中间变量管理对话框：维护不关联形状的全局公式（formulas 表 shape_id 为空，供体积公式引用）
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <el-dialog v-model="state.dialogVisible" :title="translate('中间变量（全局公式）')" width="820">
    <el-alert class="global-tip" type="info" :closable="false" show-icon
      :title="translate('中间变量为不关联形状的全局公式（如 sAvg=(sMax+sMin)/2），供各形状体积公式引用，前台递归展开后求值。添加时不要选择形状。')" />
    <el-table v-loading="state.loading" :border="true" :data="state.rows" size="small" max-height="380" :stripe="true">
      <el-table-column :label="translate('名称')" min-width="110">
        <template #default="{ row }">
          {{ row.names?.[state.defaultLang] || Object.values(row.names || {})[0] || '—' }}
        </template>
      </el-table-column>
      <el-table-column prop="code" :label="translate('标识')" width="120" show-overflow-tooltip />
      <el-table-column prop="columnar" :label="translate('公式')" min-width="200" show-overflow-tooltip />
      <el-table-column :label="translate('状态')" width="70" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? translate('启用') : translate('禁用') }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column :label="translate('操作')" width="100" align="center">
        <template #default="{ row }">
          <el-tooltip :content="translate('编辑')" placement="bottom">
            <el-button v-permissions="{ permission: ['standardsFormulas:write'] }" :icon="Edit" text type="primary"
              @click="handleEdit(row)" />
          </el-tooltip>
          <el-tooltip :content="translate('删除')" placement="bottom">
            <el-button v-permissions="{ permission: ['standardsFormulas:delete'] }" :icon="Delete" text type="danger"
              @click="handleDelete(row)" />
          </el-tooltip>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty :description="translate('暂无中间变量')" :image-size="60" />
      </template>
    </el-table>
    <template #footer>
      <el-button @click="state.dialogVisible = false">{{ translate('关闭') }}</el-button>
      <el-button v-permissions="{ permission: ['standardsFormulas:write'] }" :icon="Plus" type="primary"
        @click="handleEdit(null)">{{ translate('添加中间变量') }}</el-button>
    </template>
    <calculations-formulas-edit ref="editRef" @fetch-data="onFormulaSaved" />
  </el-dialog>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { useAclStore } from '/@/store/modules/acl'
import { Delete, Edit, Plus } from '@element-plus/icons-vue'
import { formulasAll, formulasDelete } from '/@/api/formulas'
import { ElMessageBox } from 'element-plus'

/* 组件模板名称 */
const templateName = 'StandardsProductsFormulasGlobal'
defineOptions({
  name: templateName,
})

/* 权限和语言相关状态 */
const aclStore = useAclStore()
const { defaultItem } = storeToRefs(aclStore)

/* 事件和全局方法 */
const emit = defineEmits(['fetch-data'])
const $baseMessage = inject<any>('$baseMessage')

/* 核心响应式状态 */
const editRef = ref<any>(null)
const state = reactive<any>({
  dialogVisible: false, // 对话框可见状态
  loading: false, // 列表加载中
  rows: [] as any[], // 中间变量列表（shape_id 为空的公式）
  defaultLang: defaultItem.value.languages || 'zh-cn',
})

/**
 * 拉取中间变量列表：formulasAll 全量后前端过滤 shape_id 为空的公式
 */
const fetchData = async () => {
  state.loading = true
  try {
    const { data }: any = await formulasAll()
    const list = Array.isArray(data) ? data : data?.list || []
    state.rows = list
      .filter((item: any) => !Number(item.shape_id))
      .sort((a: any, b: any) => String(a.code).localeCompare(String(b.code)))
  } finally {
    state.loading = false
  }
}

const showDialog = () => {
  state.dialogVisible = true
  fetchData()
}

const handleEdit = (row: any = null) => {
  editRef.value?.showEdit(row)
}

/**
 * 公式保存后刷新列表并通知列表页刷新计数
 */
const onFormulaSaved = () => {
  fetchData()
  emit('fetch-data')
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定删除中间变量「${row.names?.[state.defaultLang] || row.code}」吗？`, translate('提示'), {
    draggable: true,
    type: 'warning',
  }).then(async () => {
    await formulasDelete({ id: [row.id] })
    $baseMessage(translate('删除成功'), 'success', 'hey')
    fetchData()
    emit('fetch-data')
  }).catch(() => { /* 取消删除 */ })
}

// 暴露组件方法
defineExpose({ showDialog })
</script>

<style lang="scss" scoped>
.global-tip {
  margin-bottom: 12px;
}
</style>
