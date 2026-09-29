<!--
 * @Description: 材料类别编辑抽屉（code 必填唯一；names 多语言结构，默认语言直填）
 * @Date: 2026-09-14
-->
<template>
  <el-drawer v-model="state.drawerVisible" append-to-body direction="rtl" size="40%" :title="state.title">
    <el-form ref="formRef" label-width="90px" :model="editForm" :rules="state.rules">
      <el-form-item :label="translate('类别编码')" prop="code">
        <el-input v-model.trim="editForm.code" clearable :placeholder="translate('唯一编码，如 stainless')" />
      </el-form-item>
      <el-form-item :label="translate('类别名称')" prop="names">
        <el-input v-model.trim="editForm.names" clearable :placeholder="translate('如 奥氏体不锈钢（默认语言）')" />
        <div class="edit-hint">{{ translate('多语言结构默认写入 zh_cn，其余语言可后续在数据中补充') }}</div>
      </el-form-item>
      <el-form-item :label="translate('缩写')" prop="abbreviation">
        <el-input v-model.trim="editForm.abbreviation" clearable :placeholder="translate('选填')" />
      </el-form-item>
      <el-form-item :label="translate('排序')" prop="sort">
        <el-input-number v-model="editForm.sort" :min="0" style="width: 160px" />
      </el-form-item>
      <el-form-item :label="translate('启用')" prop="status">
        <el-switch v-model="editForm.status" :active-value="1" :inactive-value="0" />
      </el-form-item>
      <div class="drawer-footer">
        <el-button @click="state.drawerVisible = false">{{ translate('取消') }}</el-button>
        <el-button :loading="state.saving" type="primary" @click="handleSave">{{ translate('保存') }}</el-button>
      </div>
    </el-form>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { ElMessage } from 'element-plus'
import { materialCategoriesDetail, materialCategoriesSave } from '/@/api/materials'

const emit = defineEmits(['fetch-data'])

const formRef = ref<any>(null)

const state = reactive({
  drawerVisible: false,
  title: '',
  saving: false,
  rules: {
    code: [{ required: true, message: () => translate('类别编码不能为空'), trigger: 'blur' }],
  },
})

const defaultForm = () => ({
  id: 0,
  code: '',
  names: '',
  abbreviation: '',
  sort: 0,
  status: 1,
})

const editForm = reactive<any>(defaultForm())

const showEdit = async (row?: any) => {
  state.title = row?.id ? translate('编辑类别') : translate('新增类别')
  Object.assign(editForm, defaultForm())
  state.drawerVisible = true
  if (row?.id) {
    try {
      const { data } = await materialCategoriesDetail({ id: row.id })
      const names = data.names || {}
      Object.assign(editForm, {
        id: data.id,
        code: data.code ?? '',
        // names 为多语言 JSON：编辑时取默认语言回填，保存时写回 {zh_cn}
        names: names.zh_cn || names.zh || Object.values(names)[0] || '',
        abbreviation: data.abbreviation ?? '',
        sort: data.sort ?? 0,
        status: data.status ?? 1,
      })
    } catch (error: any) {
      console.error('[materialCategoriesEdit] 详情获取失败:', error)
      state.drawerVisible = false
    }
  }
}

const handleSave = async () => {
  if (formRef.value) {
    try {
      await formRef.value.validate()
    } catch {
      return
    }
  }
  state.saving = true
  try {
    await materialCategoriesSave({
      id: editForm.id || 0,
      code: editForm.code,
      names: editForm.names ? { zh_cn: editForm.names } : undefined,
      abbreviation: editForm.abbreviation || null,
      sort: editForm.sort,
      status: editForm.status,
    })
    ElMessage.success(translate('保存成功'))
    state.drawerVisible = false
    emit('fetch-data')
  } catch (error: any) {
    console.error('[materialCategoriesEdit] 保存失败:', error)
  } finally {
    state.saving = false
  }
}

defineExpose({ showEdit })
</script>

<style scoped lang="scss">
.edit-hint {
  color: var(--el-color-info);
  font-size: 12px;
  line-height: 1.5;
}

.drawer-footer {
  margin-top: 20px;
  text-align: right;
}
</style>
