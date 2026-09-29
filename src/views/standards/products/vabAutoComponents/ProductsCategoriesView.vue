<!--
 * @Author: trexwb
 * @Date: 2025-03-26 09:15:41
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-04-30 12:13:13
 * @FilePath: /console/web/src/views/standards/products/vabAutoComponents/ProductsCategoriesView.vue
 * @Description: 
 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-drawer v-model="state.drawerdFormVisible" append-to-body :before-close="handleClose" direction="rtl" size="50%"
    :title="drawerTitleText">
    <!-- 详情展示：仅显示当前维护语言（全局顶部切换器驱动），缺失回退默认语言 -->
    <div v-if="stateLangOptions.length > 0" class="drawer-view-langbar">
      <span class="drawer-view-langbar__label">{{ translate('当前语言') }}</span>
      <span class="drawer-view-langbar__name">{{ stateCurLangName }}</span>
      <span v-if="stateCurLang === state.defaultLang" class="drawer-view-langbar__badge">{{ translate('默认语言') }}</span>
    </div>
    <el-descriptions border :column="2" direction="horizontal">
      <el-descriptions-item>
        <template #label>{{ translate('上级栏目') }}</template>
        <el-cascader v-model="parentIds" :disabled="true" clearable filterable :options="state.categorieOptions"
          :props="{ label: 'label', value: 'id', checkStrictly: true }" :show-all-levels="true">
          <template #default="{ node, data }">
            <span>{{ textOfNames(data.names) }}</span>
          </template>
        </el-cascader>
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('名称') }}</template>
        {{ textOfNames(viewForm.names) }}
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('简写') }}</template>
        {{ viewForm.abbreviation }}
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('图标') }}</template>
        <el-image v-if="viewForm.covers && viewForm.covers.length > 0"
          :preview-src-list="viewForm.covers.map((element: any) => element.url)" :src="viewForm.covers[0]?.url"
          style="width: 100px; height: 100px" />
        <el-text v-else class="mx-1" type="info">{{ translate('无') }}</el-text>
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('备注') }}</template>
        {{ textOfNames(viewForm.remarks) }}
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('排序') }}</template>
        {{ viewForm.sort }}
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('启用') }}</template>
        {{ viewForm.status == '1' ? translate('是') : translate('否') }}
      </el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('关闭') }}</el-button>
      <el-button v-permissions="{ permission: ['standardsCategories:write'] }" :icon="Edit" type="success"
        @click="handleEdit">
        {{ translate('修改') }}
      </el-button>
      <el-button v-permissions="{ permission: ['standardsCategories:delete'] }" :icon="Delete" type="danger"
        @click="handleDelete">
        {{ translate('删除') }}
      </el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { useAclStore } from '/@/store/modules/acl'
import { Close, Edit, Delete } from '@element-plus/icons-vue'
import { categoriesDetail, categoriesAll } from '/@/api/categories'
import { ElLoading } from 'element-plus'

/* 组件模板名称 */
const templateName = 'StandardsProductsCategoriesView'

/* 定义组件选项 */
defineOptions({
  name: templateName, // 注册组件名称，用于调试和keep-alive缓存标识
})

/* 权限和语言相关状态 */
const aclStore = useAclStore()
const { configuration, languages, defaultItem } = storeToRefs(aclStore) // 解构多语言列表响应式引用

/* 编辑器相关引用 */
// VMdEditor.use(githubTheme)
const viewForm = ref<any>({})
const parentIds = ref<any>([])

/* 事件和全局方法 */
const emit = defineEmits(['handle-edit', 'handle-delete']) // 定义组件事件

const fetchCategories = async () => {
  const { data } = await categoriesAll()
  function transformData(options: any[]): any {
    return options.map(item => ({
      ...item,
      label: item.names[state.defaultLang] || '',
      children: item.children ? transformData(item.children) : undefined
    }));
  }
  state.categorieOptions = transformData(Array.isArray(data) ? data : [])
}

const findParentIds = (jsonArr: any, targetId: any) => {
  const thisParentIds: any = []
  const findParent = (arr: any) => {
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i]
      if (item.id === targetId) {
        return true
      } else if (item.children) {
        const found = findParent(item.children)
        if (found) {
          thisParentIds.unshift(item.id)
          return true
        }
      }
    }
    return false
  }

  findParent(jsonArr)
  return thisParentIds
}

/* 核心响应式状态 */
const state = reactive<any>({
  drawerdFormVisible: false, // 表单抽屉可见状态
  defaultLang: defaultItem.value.languages || 'zh-cn', // 默认语言编码
  loading: false
})

/** 接口语言列表（兼容数组 / Record<code,{code,name}> 两种返回形态） */
const stateLangOptions = computed<any[]>(() => {
  const dict = languages.value
  if (Array.isArray(dict)) return dict.filter((item: any) => item && item.code)
  if (dict && typeof dict === 'object') return Object.values(dict).filter((item: any) => item && item.code)
  return []
})

/** 当前维护语言（全局顶部切换器驱动，默认回退默认语言） */
const stateCurLang = computed(() => {
  const global = aclStore.getCurrentLang
  return global || state.defaultLang
})

/** 当前维护语言展示名 */
const stateCurLangName = computed(() => {
  const target = stateLangOptions.value.find((item: any) => item.code === stateCurLang.value)
  return target ? target.name : stateCurLang.value
})

/** 语言文本取值：优先当前维护语言，缺失时回退默认语言，避免界面空白 */
const textOfNames = (names: any) => {
  if (!names || typeof names !== 'object') return ''
  return names[stateCurLang.value] || names[state.defaultLang] || ''
}

/** 抽屉标题：带当前对象名称上下文 */
const drawerTitleText = computed(() => {
  const name = textOfNames(viewForm.value.names)
  return `${translate('详情:')} [${name}]`
})

/**
 * 获取文章详情数据
 * @param {number} id - 文章ID
 * @returns {Promise<object>} 文章详情数据
 */
const fetchData = async (id: any) => {
  if (state.loading) return
  state.loading = true
  const { data } = await categoriesDetail({ id: id || 0 })
  state.loading = false
  return data
}

/**
 * 显示编辑对话框核心逻辑
 * @param {object|null} row - 行数据对象（null时为新建模式）
 * @description 处理新建/编辑模式初始化逻辑，包含草稿加载功能
 */
const showView = async (row: any) => {
  const loadingInstance = ElLoading.service({ fullscreen: true });
  viewForm.value = await fetchData(row.id)
  if (viewForm.value.parent_id) {
    parentIds.value = findParentIds(state.categorieOptions, viewForm.value.id)
  }
  open();
  loadingInstance.close();
}

// 暴露组件方法
defineExpose({ showView })

// 对话框控制方法
const open = () => { state.drawerdFormVisible = true }
const close = async () => { state.drawerdFormVisible = false }

const handleClose = () => {
  close()
}

const handleEdit = () => {
  close()
  emit('handle-edit', viewForm.value)
}

const handleDelete = () => {
  close()
  emit('handle-delete', viewForm.value)
}

/* 生命周期钩子 */
onMounted(() => { /* 组件挂载后逻辑 */ })
onBeforeUnmount(() => { /* 组件卸载前清理逻辑 */ })
onBeforeMount(() => {
  parentIds.value && typeof parentIds.value.destroy === 'function' && parentIds.value.destroy()
  viewForm.value && typeof viewForm.value.destroy === 'function' && viewForm.value.destroy()
  fetchCategories()
})
</script>

<style lang="scss" scoped>
.drawer-view-langbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding: 8px 12px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: var(--el-border-radius-base, 4px);
  background: var(--el-fill-color-light, #f5f7fa);

  .drawer-view-langbar__label {
    flex: none;
    color: var(--el-text-color-regular);
    font-size: 13px;
  }

  .drawer-view-langbar__name {
    flex: none;
    color: var(--el-text-color-primary);
    font-size: 13px;
    font-weight: 600;
  }

  .drawer-view-langbar__badge {
    flex: none;
    padding: 1px 8px;
    color: var(--el-color-success);
    font-size: 12px;
    border: 1px solid var(--el-color-success-light-5, #b3e19d);
    border-radius: 999px;
  }
}
</style>
