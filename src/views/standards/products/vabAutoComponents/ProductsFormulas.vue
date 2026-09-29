<!--
 * @Author: ${git_name}
 * @Date: 2025-04-25 10:46:29
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-05-06 12:15:36
 * @FilePath: /console/web/src/views/standards/products/vabAutoComponents/ProductsFormulas.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-dialog v-model="state.dialogVisible" :title="state.title" width="800">
    <el-form :model="state.form" label-width="80px">
      <el-form-item :label="translate('名称')">
        <el-input v-model="state.form.name" :disabled="!!choose.name" :placeholder="translate('名称')" />
      </el-form-item>
      <el-form-item :label="translate('标识')">
        <el-input v-model="state.form.code" :disabled="!!choose.code" :placeholder="translate('标识')" />
      </el-form-item>
      <el-form-item :label="translate('公式')">
        <el-input v-model="state.form.columnar" :rows="2" type="textarea" :placeholder="translate('公式')" />
      </el-form-item>
      <el-form-item :label="translate('默认单位')">
        <el-select v-model="state.form.unit" :placeholder="translate('请选择默认单位')">
          <el-option
            v-for="item in ['mm','inch','N*m','kg*f*cm','kg','lb','ksi']"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <el-tabs type="border-card">
      <el-tab-pane :label="translate('形状关联')">
        <el-table ref="multipleTableRef" v-loading="state.loading" :border="true" :data="filterTableShapeData"
          :stripe="true" @selection-change="setSelectRows" row-key="code" max-height="300">
          <el-table-column prop="names" :label="translate('名称')">
            <template #header>
              <el-input v-model="search.names" :placeholder="translate('名称')" />
            </template>
            <template #default="{ row }">
              <div style="text-align: left;">{{ Object.values(row.names).join('|') }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="code" :label="translate('标识')">
            <template #header>
              <el-input v-model="search.code" :placeholder="translate('标识')" />
            </template>
            <template #default="{ row }">
              {{ row.code }}
            </template>
          </el-table-column>
          <el-table-column prop="columnar" :label="translate('公式')" />
          <!-- <el-table-column type="selection" /> -->
          <el-table-column :label="translate('操作')" width="100">
            <template #default="{ row }">
              <el-button plain @click="state.form.columnar = `${state.form.columnar}${row.code}`">{{ translate('引用') }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane :label="translate('全部公式')">
        <el-table ref="multipleTableRef" v-loading="state.loading" :border="true" :data="filterTableAllData"
          :stripe="true" @selection-change="setSelectRows" row-key="code" max-height="300">
          <el-table-column prop="names" :label="translate('名称')">
            <template #header>
              <el-input v-model="search.names" :placeholder="translate('名称')" />
            </template>
            <template #default="{ row }">
              <div style="text-align: left;">{{ Object.values(row.names).join('|') }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="code" :label="translate('标识')">
            <template #header>
              <el-input v-model="search.code" :placeholder="translate('标识')" />
            </template>
            <template #default="{ row }">
              {{ row.code }}
            </template>
          </el-table-column>
          <el-table-column prop="columnar" :label="translate('公式')" />
          <!-- <el-table-column type="selection" /> -->
          <el-table-column :label="translate('操作')" width="100">
            <template #default="{ row }">
              <el-button plain @click="state.form.columnar = `${state.form.columnar}${row.code}`">{{ translate('引用') }}</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="state.dialogVisible = false">{{ translate('取消') }}</el-button>
        <el-button type="primary" @click="handleSubmit">{{ translate('确认') }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { getStorage, removeStorage } from '/@/utils/storage'
import type { TableInstance } from 'element-plus'
const templateName = 'StandardsProductsFormulas'
defineOptions({
  name: templateName,
})

const multipleTableRef = ref<TableInstance>()
const props = defineProps(['shape', 'formulas', 'choose'])
const emit = defineEmits(['change-formulas']) // 定义组件事件

const state = reactive<any>({
  title: '', // 对话框标题
  dialogVisible: false, // 表单抽屉可见状态
  loading: false,
  shape: [],
  selectionRows: [],
  num: 0,
  form: {
    name: '',
    code: '',
    columnar: '',
    unit:''
  }
});

const search = ref({
  names: '',
  code: ''
});

const rows = reactive({
  total: 0,
  list: [] as any[],
});

const toggleSelection = () => {
  multipleTableRef.value!.clearSelection();
  if (rows.total && props.choose.length > 0) {
    rows.list.forEach((row) => {
      if (props.choose.includes(row.code)) {
        multipleTableRef.value!.toggleRowSelection(row, undefined, false);
      }
    });
  }
}

const setSelectRows = (selection: any) => {
  state.selectionRows = selection.map((element: any) => element.code as string);
}

const handleSubmit = () => {
  emit('change-formulas', state.num, state.form);
  state.dialogVisible = false;
}

const filterTableShapeData = computed(() =>
  (rows.list || []).filter((data) =>
    (
      !!data.shape_id && state.shape.includes(data.shape_id)
    )
    &&
    (
      !search.value.names || Object.values(data.names).join('|').toLowerCase().includes(search.value.names.toLowerCase())
    )
    &&
    (
      !search.value.code || data.code.toLowerCase().includes(search.value.code.toLowerCase())
    )
  )
)

const filterTableAllData = computed(() =>
  (rows.list || []).filter((data) =>
    (
      !search.value.names || Object.values(data.names).join('|').toLowerCase().includes(search.value.names.toLowerCase())
    )
    &&
    (
      !search.value.code || data.code.toLowerCase().includes(search.value.code.toLowerCase())
    )
  )
)

const showDialog = (num: number, row: any) => {
  rows.total = props.formulas.length;
  rows.list = props.formulas;
  state.num = num;
  state.shape = Object.values(props.shape || {}).flat()
  state.dialogVisible = true;
  const copyFormulas = getStorage('lastCopyFormulas');
  state.form = row || {
    name: copyFormulas?.name || '',
    code: copyFormulas?.code || '',
    columnar: copyFormulas?.columnar || '',
    unit: copyFormulas?.unit || '',
  };
  if (copyFormulas) removeStorage('lastCopyFormulas');
  // nextTick(() => {
  //   toggleSelection();
  // })
}

// 暴露组件方法
defineExpose({ showDialog })

onMounted(() => { })
onBeforeUnmount(() => { })
</script>

<style lang="scss" scoped></style>