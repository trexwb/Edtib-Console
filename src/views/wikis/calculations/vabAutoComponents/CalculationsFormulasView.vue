<!--
 * @Author: trexwb
 * @Date: 2025-03-25 16:43:18
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-04-30 12:20:59
 * @FilePath: /console/web/src/views/wikis/calculations/vabAutoComponents/CalculationsFormulasView.vue
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
      <span v-else-if="!textOfNames(viewForm.names) && !textOfNames(viewForm.remarks)"
        class="drawer-view-langbar__tip">{{ translate('当前语言暂无内容，展示回退默认语言') }}</span>
    </div>
    <el-descriptions border :column="2" direction="horizontal">
      <el-descriptions-item>
        <template #label>{{ translate('公式名称') }}</template>
        {{ textOfNames(viewForm.names) }}
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('形状') }}</template>
        <template v-if="viewForm.shape">
          <span>{{ textOfNames(configuration.shape?.[viewForm.shape.location]) }}</span>
          <span v-if="textOfNames(viewForm.shape.names)">{{ textOfNames(viewForm.shape.names) }}</span>
        </template>
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('标识') }}</template>
        {{ viewForm.code }}
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('计算公式') }}</template>
        <span class="pre-line">{{ viewForm.columnar }}</span>
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('备注') }}</template>
        <span class="pre-line">{{ textOfNames(viewForm.remarks) }}</span>
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
      <el-button v-permissions="{ permission: ['standardsFormulas:write'] }" :icon="Edit" type="success"
        @click="handleEdit">
        {{ translate('修改') }}
      </el-button>
      <el-button v-permissions="{ permission: ['standardsFormulas:delete'] }" :icon="Delete" type="danger"
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
import { formulasDetail } from '/@/api/formulas'
import { ElLoading } from 'element-plus'

/* 组件模板名称 */
const templateName = 'WikisCalculationsFormulasView'

/* 定义组件选项 */
defineOptions({
  name: templateName, // 注册组件名称，用于调试和keep-alive缓存标识
})

/* 权限和语言相关状态 */
const aclStore = useAclStore()
const { languages, configuration, defaultItem } = storeToRefs(aclStore) // 解构多语言列表响应式引用

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
  const f = viewForm.value || {}
  const name = textOfNames(f.names)
  const parts = [name, f.code].filter((v) => v && String(v).trim() !== '')
  return parts.length ? `详情：${parts.join(' | ')}` : translate('详情')
})

/* 视图数据 */
const viewForm = ref<any>({})

/* 事件和全局方法 */
const emit = defineEmits(['handle-edit', 'handle-delete']) // 定义组件事件

/* 核心响应式状态 */
const state = reactive<any>({
  drawerdFormVisible: false, // 表单抽屉可见状态
  defaultLang: defaultItem.value.languages || 'zh-cn', // 默认语言编码
  loading: false
})

/**
 * 获取文章详情数据
 * @param {number} id - 文章ID
 * @returns {Promise<object>} 文章详情数据
 */
const fetchData = async (id: any) => {
  if (state.loading) return
  state.loading = true
  const { data } = await formulasDetail({ id: id || 0 })
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
  viewForm.value = await fetchData(row.id);
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
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .drawer-view-langbar__badge {
    flex: none;
    padding: 1px 8px;
    color: var(--el-color-success);
    font-size: 12px;
    border: 1px solid var(--el-color-success-light-5, #b3e19d);
    border-radius: 999px;
  }

  .drawer-view-langbar__tip {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}

.pre-line {
  white-space: pre-wrap;
}
</style>
