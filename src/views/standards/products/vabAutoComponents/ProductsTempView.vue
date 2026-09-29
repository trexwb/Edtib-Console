<!--
 * @Author: trexwb
 * @Date: 2025-03-31 10:19:58
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-06-10 15:33:27
 * @FilePath: /console/web/src/views/standards/products/vabAutoComponents/ProductsTempView.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-drawer v-model="state.drawerdFormVisible" append-to-body destroy-on-close :before-close="handleClose" direction="rtl" size="80%"
    :title="drawerTitleText">
    <div v-loading="state.loading" class="drawer-view-body">
    <!-- 详情展示：仅显示当前维护语言（全局顶部切换器驱动），缺失回退默认语言 -->
    <div v-if="stateLangOptions.length > 0" class="drawer-view-langbar">
      <span class="drawer-view-langbar__label">{{ translate('当前语言') }}</span>
      <span class="drawer-view-langbar__name">{{ stateCurLangName }}</span>
      <span v-if="stateCurLang === state.defaultLang" class="drawer-view-langbar__badge">{{ translate('默认语言') }}</span>
      <span v-else-if="!textOfNames(viewForm.names) && !(viewForm.detail || {})[stateCurLang]"
        class="drawer-view-langbar__tip">{{ translate('当前语言暂无内容，展示回退默认语言') }}</span>
    </div>
    <el-tabs v-model="state.activeName" type="border-card">
      <el-tab-pane :label="translate('产品详情')" name="detail">
        <el-tabs tab-position="left" style="height: 100%" class="demo-tabs">
          <el-tab-pane :label="translate('基本信息')">
            <el-descriptions border :column="2" direction="horizontal">
              <el-descriptions-item>
                <template #label>{{ translate('标准分类') }}</template>
                {{ viewForm.standard }}
              </el-descriptions-item>
              <el-descriptions-item>
                <template #label>{{ translate('产品分类') }}</template>
                {{
                  (viewForm.categories || []).map((cate: any) => {
                    return textOfNames(cate.names)
                  }).join(' > ')
                }}
              </el-descriptions-item>
              <el-descriptions-item>
                <template #label>{{ translate('名称') }}</template>
                {{ textOfNames(viewForm.names) }}
              </el-descriptions-item>
              <el-descriptions-item>
                <template #label>{{ translate('编号') }}</template>
                {{ `${viewForm.standard}${!viewForm.grade ? '' : '/'}${viewForm.grade}` }}
                {{ `${viewForm.code}${!viewForm.year ? '' : '-'}${viewForm.year}` }}
              </el-descriptions-item>
              <el-descriptions-item>
                <template #label>{{ translate('图标') }}</template>
                <el-image v-if="viewForm.covers && viewForm.covers.length > 0"
                  :preview-src-list="viewForm.covers.map((element: any) => element.url)" :src="viewForm.covers[0]?.url"
                  style="width: 100px; height: 100px" />
                <el-text v-else class="mx-1" type="info">{{ translate('无') }}</el-text>
              </el-descriptions-item>
            </el-descriptions>
            <el-divider content-position="left">{{ translate('详细内容') }}（{{ stateCurLangName }}）</el-divider>
            <v-md-preview
              :text="(viewForm.detail && (viewForm.detail[stateCurLang] || viewForm.detail[state.defaultLang])) || ''"></v-md-preview>
          </el-tab-pane>
          <el-tab-pane :label="translate('图片')" lazy>
            <el-descriptions border :column="1" direction="horizontal">
              <el-descriptions-item>
                <template #label>{{ translate('SVG图') }}</template>
                <el-image v-if="viewForm.svgs && viewForm.svgs.length > 0" v-for="(img, key) in viewForm.svgs"
                  :key="`svgs[${key}]`" :preview-src-list="viewForm.svgs.map((element: any) => element.url)"
                  :src="img.url" style="width: 100px; height: 100px" />
                <el-text v-else class="mx-1" type="info">{{ translate('无') }}</el-text>
              </el-descriptions-item>
              <el-descriptions-item>
                <template #label>{{ translate('渲染图') }}</template>
                <el-image v-if="viewForm.renders && viewForm.renders.length > 0" v-for="(img, key) in viewForm.renders"
                  :key="`renders[${key}]`" :preview-src-list="viewForm.renders.map((element: any) => element.url)"
                  :src="img.url" style="width: 100px; height: 100px" />
                <el-text v-else class="mx-1" type="info">{{ translate('无') }}</el-text>
              </el-descriptions-item>
              <el-descriptions-item>
                <template #label>{{ translate('CAD图') }}</template>
                <div v-if="viewForm.cads && viewForm.cads.length > 0" v-for="(img, key) in viewForm.cads"
                  :key="`cads[${key}]`">
                  <el-link type="primary">{{ img.url }}</el-link>
                </div>
                <el-text v-else class="mx-1" type="info">{{ translate('无') }}</el-text>
              </el-descriptions-item>
              <el-descriptions-item>
                <template #label>{{ translate('装配图') }}</template>
                <div v-if="viewForm.assemblies && viewForm.assemblies.length > 0"
                  v-for="(img, key) in viewForm.assemblies" :key="`assemblies[${key}]`">
                  <el-link type="primary">{{ img.url }}</el-link>
                </div>
                <el-text v-else class="mx-1" type="info">{{ translate('无') }}</el-text>
              </el-descriptions-item>
              <el-descriptions-item>
                <template #label>{{ translate('模型图') }}</template>
                <div v-if="viewForm.models && viewForm.models.length > 0" v-for="(img, key) in viewForm.models"
                  :key="`models[${key}]`">
                  <el-link type="primary">{{ img.url }}</el-link>
                </div>
                <el-text v-else class="mx-1" type="info">{{ translate('无') }}</el-text>
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
          <el-tab-pane :label="translate('形状')" lazy>
            <el-descriptions border :column="2" direction="horizontal">
              <el-descriptions-item v-for="location, key in configuration.shape" :key="`shape[${key}]`">
                <template #label>{{ textOfShape(location) }}</template>
                {{
                  (viewForm.shapes || [])
                    .filter((shape: any) => shape.location == key)
                    .map((shape: any) => {
                      return textOfNames(shape.names)
                    }).join(' | ')
                }}
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>
          <el-tab-pane :label="translate('参数')">
            <el-table :data="tableData.parameters.list" :key="`parametersTemp[${viewForm.id}]`" :border="true"
              :fit="true" :highlight-current-row="true" :stripe="true">
              <el-table-column fixed prop="mon" label="mon" align="center" sortable />
              <el-table-column fixed prop="nominal" :label="translate('公称')" align="center" sortable />
              <el-table-column fixed prop="leve" :label="translate('等级')" align="center" sortable />
              <el-table-column fixed prop="condition" :label="translate('条件')" align="center" sortable width="160" />
              <el-table-column v-for="(model, index) in tableData.parameters.column" :key="`parameters[${index}]`"
                :label="model" :prop="model" align="center" sortable :sort-method="getSortMethod(model)">
                <template #default="{ row }">
                  {{ row.values[model][row.condition] ? row.values[model][row.condition] : row.values[model] }}
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane :label="translate('长度')" lazy>
            <el-table :data="tableData.diameter_length.list" :border="true" :fit="true" :highlight-current-row="true"
              :stripe="true">
              <!-- 参数列 -->
              <el-table-column fixed prop="L" label="L" align="center" sortable />
              <!-- 型号列 -->
              <el-table-column v-for="(model, index) in tableData.diameter_length.column"
                :key="`diameter_length[${index}]`" :label="model" align="center" width="80">
                <template #default="{ row }">
                  <el-checkbox-group v-model="viewForm.diameter_length[model]">
                    <el-checkbox :label="row.L" :value="`${row.L}`" :disabled="true" class="no-text" />
                  </el-checkbox-group>
                </template>
              </el-table-column>
            </el-table>
            <el-table v-show="tableData.tolerance.list.length > 0" max-height="500" :data="tableData.tolerance.list"
              :border="true" :fit="true" :highlight-current-row="true" :stripe="true">
              <el-table-column v-for="index in tableData.tolerance.column" :key="`tolerance[${index}]`" :label="index"
                :prop="`${index}`" align="center">
                <el-table-column v-if="index === translate('条件')" :prop="translate('大于')" :label="translate('大于')" align="center">
                  <template #default="{ row }">
                    {{ row[index]['大于'] }}
                  </template>
                </el-table-column>
                <el-table-column v-if="index === translate('条件')" :prop="translate('至')" :label="translate('至')" align="center">
                  <template #default="{ row }">
                    {{ row[index]['至'] }}
                  </template>
                </el-table-column>
                <el-table-column v-if="index !== translate('条件')" prop="min" label="min" align="center">
                  <template #default="{ row }">
                    {{ row[index]['min'] }}
                  </template>
                </el-table-column>
                <el-table-column v-if="index !== translate('条件')" prop="max" label="max" align="center">
                  <template #default="{ row }">
                    {{ row[index]['max'] }}
                  </template>
                </el-table-column>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane :label="translate('图片条件')" lazy>
            <el-table :data="tableData.drawing_limit.list" :border="true" :fit="true" :highlight-current-row="true"
              :stripe="true">
              <!-- 参数列 -->
              <el-table-column fixed prop="condition" :label="translate('图形')" align="center" />
              <!-- 型号列 -->
              <el-table-column v-for="(model, index) in tableData.drawing_limit.column" :key="`drawing_limit[${index}]`"
                :label="model" align="center">
                <template #default="{ row }">
                  {{ viewForm.drawing_limit[model]?.[row.condition] || '' }}
                </template>
              </el-table-column>
            </el-table>
            <el-divider content-position="left">{{ translate('(图一)公式') }}</el-divider>
            <el-table :border="true" :data="viewForm.formulas[0]" :stripe="true">
              <el-table-column prop="name" :label="translate('公式名')" />
              <el-table-column prop="code" :label="translate('标识')" />
              <el-table-column prop="columnar" :label="translate('公式')" />
            </el-table>
            <el-divider content-position="left">{{ translate('(图二)公式') }}</el-divider>
            <el-table :border="true" :data="viewForm.formulas[1]" :stripe="true">
              <el-table-column prop="name" :label="translate('公式名')" />
              <el-table-column prop="code" :label="translate('标识')" />
              <el-table-column prop="columnar" :label="translate('公式')" />
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </el-tab-pane>
      <el-tab-pane :label="translate('综合审查')">
        <products-size-viewer ref="sizeViewerRef" :productRow="viewForm"></products-size-viewer>
      </el-tab-pane>
    </el-tabs>
    </div>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('关闭') }}</el-button>
      <el-button v-if="viewForm.status === 0" v-permissions="{ permission: ['standardsProductsTemp:write'] }"
        :icon="InfoFilled" type="danger" @click="handleSubmit">{{ translate('提交审核') }}</el-button>
      <el-button v-if="viewForm.status === 0 || viewForm.status === 1 || viewForm.status === 3"
        v-permissions="{ permission: ['standardsProductsTemp:write'] }" :icon="Edit" type="primary" @click="handleEdit">
        {{ translate('修改') }}
      </el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import VMdPreview from '@kangc/v-md-editor/lib/preview'
import '@kangc/v-md-editor/lib/style/preview.css'
import githubTheme from '@kangc/v-md-editor/lib/theme/github'
import '@kangc/v-md-editor/lib/theme/style/github.css'

// highlightjs
import hljs from 'highlight.js';

import { useAclStore } from '/@/store/modules/acl'
import { Close, Edit, Delete, InfoFilled } from '@element-plus/icons-vue'
import { productsTempDetail, productsTempSubmit } from '/@/api/productsTemp'
import { ElMessage, ElMessageBox } from 'element-plus'
import { parametersJons, lengthJson, drawingJson, parametersToTable, lengthToTable, drawingLimitTable, normalizeProductFields, toleranceTable } from '/@/utils/parseExcelToJSON'
import type { TabsPaneContext } from 'element-plus'

/* 组件模板名称 */
const templateName = 'StandardsProductsTempView'

/* 定义组件选项 */
defineOptions({
  name: templateName, // 注册组件名称，用于调试和keep-alive缓存标识
})

VMdPreview.use(githubTheme, {
  Hljs: hljs,
})

/* 权限和语言相关状态 */
const aclStore = useAclStore()
const { configuration, languages, defaultItem } = storeToRefs(aclStore) // 解构多语言列表响应式引用

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
  const direct = names[stateCurLang.value]
  if (direct && String(direct).trim()) return direct
  return names[state.defaultLang] || names['zh-cn'] || ''
}

/** 位置配置项取值：配置项为 Record<语言码, 名称>，同样按当前语言优先回退默认 */
const textOfShape = (shape: any) => {
  if (!shape || typeof shape !== 'object') return ''
  const direct = shape[stateCurLang.value]
  if (direct && String(direct).trim()) return direct
  return shape[state.defaultLang] || Object.values(shape)[0] || ''
}

/** 抽屉标题：带当前对象名称上下文 */
const drawerTitleText = computed(() => {
  const f = viewForm.value || {}
  const name = textOfNames(f.names)
  return `${translate('查看:')}[${f.standard ?? ''}${f.grade ? '/' : ''}${f.grade} ${f.code ?? ''}-${f.year ?? ''} ${name || ''}]`
})

/* 编辑器相关引用 */
// VMdEditor.use(githubTheme)
const viewForm = ref<any>({})
const sizeViewerRef = ref<any>(null);

const tableData = reactive<any>({
  parameters: {
    column: [],
    list: []
  },
  diameter_length: {
    column: [],
    list: []
  },
  drawing_limit: {
    column: [],
    list: []
  },
  tolerance: {
    column: [],
    list: []
  },
})

/* 事件和全局方法 */
const emit = defineEmits(['handle-edit', 'handle-update']) // 定义组件事件

/* 核心响应式状态 */
const state = reactive<any>({
  drawerdFormVisible: false, // 表单抽屉可见状态
  activeName: 'detail', // 当前激活的展示标签（detail=产品详情 / 综合审查）
  defaultLang: defaultItem.value.languages || 'zh-cn', // 默认语言编码,
  loading: false
})

/**
 * 获取文章详情数据
 * @param {number} id - 文章ID
 * @returns {Promise<object>} 文章详情数据
 */
const fetchData = async (id: any) => {
  const { data } = await productsTempDetail({ id: id || 0 })
  return normalizeProductFields(data)
}

const jsonToTable = (parseType: string) => {
  if (parseType === 'parameters') parametersToTable(tableData.parameters, viewForm.value)
  else if (parseType === 'diameter_length') lengthToTable(tableData.diameter_length, viewForm.value)
  else if (parseType === 'drawing_limit') drawingLimitTable(tableData.drawing_limit, viewForm.value)
  else if (parseType === 'tolerance') toleranceTable(tableData.tolerance, viewForm.value)
}

/**
 * 请求空闲帧：等一帧再继续，避免大对象初始化阻塞抽屉弹出动画
 */
const waitForFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(0)))

/**
 * 显示详情对话框核心逻辑
 * @param {object} row - 行数据对象
 * @description 先弹空壳抽屉 + 内部 loading，数据就绪后填充，避免详情解析阻塞抽屉弹出动画
 */
const showView = async (row: any) => {
  // 先弹空壳抽屉并显示内部 loading，等数据就绪后再填充
  open()
  state.loading = true
  try {
    const data = await fetchData(row.id)
    if (!data || typeof data !== 'object') {
      ElMessage.error(translate('获取产品数据失败'))
      close()
      return
    }
    await waitForFrame();
    viewForm.value = data
    viewForm.value.formulas = [[...viewForm.value.formulas?.[0] || ''], [...viewForm.value.formulas?.[1] || '']];
    if (viewForm.value.parameters) {
      jsonToTable('parameters')
    }
    if (viewForm.value.diameter_length) {
      jsonToTable('diameter_length')
    }
    if (viewForm.value.drawing_limit) {
      jsonToTable('drawing_limit')
    }
    if (viewForm.value.tolerance) {
      jsonToTable('tolerance')
    }
  } catch (error) {
    console.error('[productsTempView] 查看详情加载失败:', error)
    ElMessage.error(translate('获取产品数据失败'))
    close()
  } finally {
    state.loading = false
  }
  // 数据填充完成后刷新尺寸图（综合审查），此时抽屉内组件已完成挂载
  nextTick(() => {
    sizeViewerRef.value?.showImage()
  })
}

const getSortMethod = (model: string) => {
  return (a: any, b: any): number => {
    const valueA = getValueFromRow(a, model);
    const valueB = getValueFromRow(b, model);
    return valueA - valueB;
  };
}
const getValueFromRow = (row: any, model: string): number => {
  const rawValue = row?.values?.[model] ? (
    row.values[model][row.condition] !== undefined
      ? row.values[model][row.condition]
      : row.values[model]
  ) : 0;
  const numericValue = parseFloat(String(rawValue).trim()) * 1000;
  return isNaN(numericValue) ? Number.NEGATIVE_INFINITY : numericValue;
}

// 暴露组件方法
defineExpose({ showView })

// 对话框控制方法
const open = () => {
  state.drawerdFormVisible = true
}
const close = async () => { state.drawerdFormVisible = false }

const handleSubmit = () => {
  ElMessageBox.confirm(translate('您确定要提交审核吗？提交后将不能修改！'), translate('提示'), {
    draggable: true,
    type: 'warning',
  })
    .then(async () => {
      state.loading = true
      await productsTempSubmit({
        id: viewForm.value.id,
      })
      ElMessage({
        message: translate('提交成功，等待审核！'),
        type: 'success',
      })
      state.loading = false
      emit('handle-update')
      close()
    })
    .catch((err) => {
      console.log(err)
    })
}

const handleClose = () => {
  close()
}

const handleEdit = () => {
  close()
  emit('handle-edit', viewForm.value)
}

/* 生命周期钩子 */
onMounted(() => { /* 组件挂载后逻辑 */ })
onBeforeUnmount(() => { /* 组件卸载前清理逻辑 */ })
</script>

<style lang="scss" scoped>
.drawer-view-body {
  min-height: 60vh;

  /* 语言内容整体高度撑满，避免切换时跳动 */
  :deep(.el-tabs) {
    height: 100%;
  }
}

.drawer-view-langbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding: 8px 12px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: var(--el-border-radius-base, 4px);
  background: var(--el-fill-color-light, #f5f7fa);

  &__label {
    flex: none;
    color: var(--el-text-color-regular);
    font-size: 13px;
  }

  &__name {
    flex: none;
    font-weight: 600;
  }

  &__badge {
    flex: none;
    padding: 1px 8px;
    color: var(--el-color-success);
    font-size: 12px;
    border: 1px solid var(--el-color-success-light-5, #b3e19d);
    border-radius: 999px;
  }

  &__tip {
    flex: none;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}
</style>