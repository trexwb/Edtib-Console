<!--
 * @Description: 材料编辑抽屉（基本信息 / 化学成分 / 近似对照 三区块维护；子表随保存全量替换）
 *   材料标准无审核逻辑：保存直接生效（adminSave 事务内写主表 + 两子表）
 * @Date: 2026-09-14
-->
<template>
  <el-drawer v-model="state.drawerVisible" append-to-body :before-close="handleClose" direction="rtl" size="78%"
    :title="state.title">
    <el-form ref="formRef" label-width="90px" :model="editForm" :rules="state.rules" class="drawer-edit-form">
      <el-divider content-position="left">{{ translate('基本信息') }}</el-divider>
      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item :label="translate('牌号')" prop="code">
            <el-input v-model.trim="editForm.code" clearable :placeholder="translate('如 06Cr18Ni11Ti')" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item :label="translate('中国ISC')" prop="isc">
            <el-input v-model.trim="editForm.isc" clearable :placeholder="translate('统一数字牌号，如 S32168')" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item :label="translate('旧牌号')" prop="old_code">
            <el-input v-model.trim="editForm.old_code" clearable :placeholder="translate('旧国标牌号')" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item :label="translate('类别')" prop="category_id">
            <el-select v-model="editForm.category_id" clearable filterable :placeholder="translate('请选择类别')"
              style="width: 100%">
              <el-option v-for="item in state.categories" :key="`cat${item.id}`" :label="categoryLabel(item)"
                :value="item.id" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item :label="translate('对应标准')" prop="standard">
            <el-input v-model.trim="editForm.standard" clearable :placeholder="translate('如 GB/T 20878-2007')" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item :label="translate('标准全名')" prop="standard_name">
            <el-input v-model.trim="editForm.standard_name" clearable :placeholder="translate('对应标准全名')" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="translate('其他名称')" prop="alias">
            <el-select v-model="editForm.alias" allow-create clearable filterable multiple
              :placeholder="translate('输入别名后回车，可多个')" style="width: 100%">
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="translate('性能标签')" prop="property">
            <el-select v-model="editForm.property" allow-create clearable filterable multiple
              :placeholder="translate('如 耐腐蚀 / 耐高温，回车添加')" style="width: 100%">
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item :label="translate('密度')" prop="density">
            <el-input-number v-model="editForm.density" :min="0" :precision="4" :step="0.1" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item :label="translate('排序')" prop="sort" label-width="60px">
            <el-input-number v-model="editForm.sort" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item :label="translate('启用')" prop="status" label-width="60px">
            <el-switch v-model="editForm.status" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="translate('详细说明')" prop="detail">
            <el-input v-model="editForm.detail" :rows="3" type="textarea" :placeholder="translate('材料补充说明（选填）')" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">{{ translate('化学成分') }}（%）</el-divider>
      <div class="subtable-toolbar">
        <el-button v-permissions="{ permission: ['standardsMaterials:write'] }" :icon="Plus" size="small"
          type="primary" @click="addChemistry">{{ translate('添加元素') }}</el-button>
        <span class="subtable-tip">{{ translate('未规定的边界留空：仅上限显示 ≤值，仅下限显示 ≥值；公式类备注写入备注列') }}</span>
      </div>
      <el-table :data="editForm.chemistries" border max-height="320" size="small">
        <el-table-column :label="translate('元素')" width="140">
          <template #default="{ row }">
            <el-input v-model.trim="row.element" clearable :placeholder="translate('C / Cr / Ni')" size="small" />
          </template>
        </el-table-column>
        <el-table-column :label="translate('最小值')" width="160">
          <template #default="{ row }">
            <el-input-number v-model="row.min" :controls="false" :min="0" :precision="4" size="small"
              style="width: 100%" />
          </template>
        </el-table-column>
        <el-table-column :label="translate('最大值')" width="160">
          <template #default="{ row }">
            <el-input-number v-model="row.max" :controls="false" :min="0" :precision="4" size="small"
              style="width: 100%" />
          </template>
        </el-table-column>
        <el-table-column :label="translate('备注 / 公式')">
          <template #default="{ row }">
            <el-input v-model.trim="row.note" clearable :placeholder="translate('如 Ti:5C~0.70')" size="small" />
          </template>
        </el-table-column>
        <el-table-column :label="translate('操作')" width="70">
          <template #default="{ $index }">
            <el-button link type="danger" size="small" @click="editForm.chemistries.splice($index, 1)">
              {{ translate('删除') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-divider content-position="left">{{ translate('近似对照表') }}</el-divider>
      <div class="subtable-toolbar">
        <el-button v-permissions="{ permission: ['standardsMaterials:write'] }" :icon="Plus" size="small"
          type="primary" @click="addEquivalent">{{ translate('添加对照分组') }}</el-button>
        <span class="subtable-tip">{{ translate('同一分组可有多行；未列国家写入扩展（JSON）') }}</span>
      </div>
      <el-table :data="editForm.equivalents" border class="equivalents-table" max-height="360" size="small">
        <el-table-column :label="translate('分组')" width="150">
          <template #default="{ row }">
            <el-input v-model.trim="row.group" clearable :placeholder="translate('如 奥氏体不锈钢')" size="small" />
          </template>
        </el-table-column>
        <el-table-column v-for="col in EQUIVALENT_COLUMNS" :key="col.prop" :label="col.label" width="130">
          <template #default="{ row }">
            <el-input v-model.trim="row[col.prop]" clearable size="small" />
          </template>
        </el-table-column>
        <el-table-column :label="translate('扩展')" width="170">
          <template #default="{ row }">
            <el-input v-model.trim="row.extra" clearable :placeholder="translate('JSON（选填）')" size="small" />
          </template>
        </el-table-column>
        <el-table-column fixed="right" :label="translate('操作')" width="70">
          <template #default="{ $index }">
            <el-button link type="danger" size="small" @click="editForm.equivalents.splice($index, 1)">
              {{ translate('删除') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="drawer-footer">
        <el-button @click="handleClose">{{ translate('取消') }}</el-button>
        <el-button :loading="state.saving" type="primary" @click="handleSave">{{ translate('保存') }}</el-button>
      </div>
    </el-form>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { materialsDetail, materialsSave, materialCategoriesList } from '/@/api/materials'

const emit = defineEmits(['fetch-data'])

const EQUIVALENT_COLUMNS = [
  { prop: 'gb', label: '中国GB' },
  { prop: 'isc', label: '中国ISC' },
  { prop: 'cns', label: '中国台湾CNS' },
  { prop: 'jis', label: '日本JIS' },
  { prop: 'ks', label: '韩国KS' },
  { prop: 'astm', label: '美国ASTM' },
  { prop: 'uns', label: '美国UNS' },
  { prop: 'iso', label: 'ISO' },
  { prop: 'din', label: '德国DIN' },
  { prop: 'wnr', label: '德国W-Nr.' },
  { prop: 'nf', label: '法国NF' },
  { prop: 'en', label: '欧标EN' },
  { prop: 'gost', label: '俄罗斯GOST' },
  { prop: 'ss', label: '瑞典SS' },
  { prop: 'bs', label: '英国BS' },
]

const formRef = ref<any>(null)

const state = reactive({
  drawerVisible: false,
  title: '',
  saving: false,
  categories: [] as any[],
  rules: {
    code: [{ required: true, message: () => translate('牌号不能为空'), trigger: 'blur' }],
  },
})

const defaultForm = () => ({
  id: 0,
  code: '',
  isc: '',
  old_code: '',
  standard: '',
  standard_name: '',
  alias: [] as string[],
  property: [] as string[],
  category_id: null as number | null,
  density: null as number | null,
  detail: '',
  sort: 0,
  status: 1,
  chemistries: [] as any[],
  equivalents: [] as any[],
})

const editForm = reactive<any>(defaultForm())

const categoryLabel = (item: any) => {
  const names = item.names || {}
  return names.zh_cn || names.zh || Object.values(names)[0] || item.code
}

const fetchCategories = async () => {
  try {
    const { data } = await materialCategoriesList({ page: 1, pageSize: 500 })
    state.categories = data?.list || []
  } catch {
    state.categories = []
  }
}

const showEdit = async (row?: any) => {
  state.title = row?.id ? translate('编辑材料') : translate('新增材料')
  Object.assign(editForm, defaultForm())
  state.drawerVisible = true
  fetchCategories()
  if (row?.id) {
    state.saving = true
    try {
      const { data } = await materialsDetail({ id: row.id })
      Object.assign(editForm, {
        id: data.id,
        code: data.code ?? '',
        isc: data.isc ?? '',
        old_code: data.old_code ?? '',
        standard: data.standard ?? '',
        standard_name: data.standard_name ?? '',
        alias: data.alias ?? [],
        property: data.property ?? [],
        category_id: data.category_id ?? null,
        density: data.density ?? null,
        detail: data.detail ?? '',
        sort: data.sort ?? 0,
        status: data.status ?? 1,
        chemistries: (data.chemistries || []).map((item: any) => ({ ...item })),
        equivalents: (data.equivalents || []).map((item: any) => ({ ...item, extra: typeof item.extra === 'object' && item.extra !== null ? JSON.stringify(item.extra) : (item.extra ?? '') })),
      })
    } catch (error: any) {
      console.error('[materialsEdit] 详情获取失败:', error)
      state.drawerVisible = false
    } finally {
      state.saving = false
    }
  }
}

const addChemistry = () => {
  editForm.chemistries.push({ element: '', min: null, max: null, note: '', sort: editForm.chemistries.length })
}

const addEquivalent = () => {
  const row: any = { group: '', sort: editForm.equivalents.length }
  EQUIVALENT_COLUMNS.forEach((col) => (row[col.prop] = ''))
  row.extra = ''
  editForm.equivalents.push(row)
}

const handleClose = () => {
  state.drawerVisible = false
}

const handleSave = async () => {
  if (formRef.value) {
    try {
      await formRef.value.validate()
    } catch {
      return
    }
  }
  // 成分校验：元素必填 + min<=max（对齐方案 4.3 录入规范）
  for (const item of editForm.chemistries) {
    if (!item.element || !String(item.element).trim()) {
      ElMessage.warning(translate('化学成分存在未填写的元素，请补全或删除该行'))
      return
    }
    if (item.min != null && item.max != null && Number(item.min) > Number(item.max)) {
      ElMessage.warning(translate(`元素 ${item.element} 的最小值大于最大值，请修正`))
      return
    }
  }
  for (const item of editForm.equivalents) {
    if (!item.group || !String(item.group).trim()) {
      ElMessage.warning(translate('近似对照存在未填写的分组，请补全或删除该行'))
      return
    }
  }

  state.saving = true
  try {
    const payload: any = {
      id: editForm.id || 0,
      code: editForm.code,
      isc: editForm.isc || null,
      old_code: editForm.old_code || null,
      standard: editForm.standard || null,
      standard_name: editForm.standard_name || null,
      alias: editForm.alias?.length ? editForm.alias : null,
      property: editForm.property?.length ? editForm.property : null,
      category_id: editForm.category_id ?? null,
      density: editForm.density,
      detail: editForm.detail || null,
      sort: editForm.sort,
      status: editForm.status,
      chemistries: editForm.chemistries.map((item: any, index: number) => ({
        element: item.element,
        min: item.min,
        max: item.max,
        note: item.note || null,
        sort: index,
      })),
      equivalents: editForm.equivalents.map((item: any, index: number) => {
        let extra: any = null
        if (item.extra) {
          try { extra = JSON.parse(item.extra) } catch { extra = item.extra }
        }
        const row: any = { group: item.group, sort: index }
        EQUIVALENT_COLUMNS.forEach((col) => (row[col.prop] = item[col.prop] || null))
        row.extra = extra
        return row
      }),
    }
    await materialsSave(payload)
    ElMessage.success(translate('保存成功'))
    state.drawerVisible = false
    emit('fetch-data')
  } catch (error: any) {
    console.error('[materialsEdit] 保存失败:', error)
  } finally {
    state.saving = false
  }
}

defineExpose({ showEdit })
</script>

<style scoped lang="scss">
.subtable-toolbar {
  align-items: center;
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.subtable-tip {
  color: var(--el-color-info);
  font-size: 12px;
}

.equivalents-table {
  :deep(.el-table__inner-wrapper) {
    overflow-x: auto;
  }
}

.drawer-footer {
  margin-top: 20px;
  text-align: right;
}
</style>
