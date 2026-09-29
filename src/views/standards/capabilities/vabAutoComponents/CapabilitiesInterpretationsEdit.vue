<!--
 * @Author: ${git_name}
 * @Date: 2025-07-28 13:42:22
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-07-28 13:45:23
 * @FilePath: /console/web/src/views/standards/capabilities/vabAutoComponents/CapabilitiesInterpretationsEdit.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-drawer v-model="state.drawerdFormVisible" append-to-body :before-close="handleClose" direction="rtl" size="70%"
    :title="drawerTitleText">
    <el-form ref="formRef" label-width="80px" :model="editForm" :rules="state.fromRules" class="drawer-edit-form">
      <!-- 维护语言切换：仅显示/维护当前语言内容，保存仍提交全部语言数据 -->
      <div v-if="stateLangOptions.length > 0" class="drawer-edit-langbar">
        <span class="drawer-edit-langbar__label">{{ translate('维护语言') }}</span>
        <el-select v-model="editLangModel" class="drawer-edit-langbar__select" size="default">
          <el-option v-for="lang in stateLangOptions" :key="lang.code" :label="lang.name"
            :value="lang.code" />
        </el-select>
        <span v-if="stateCurLang === state.defaultLang" class="drawer-edit-langbar__badge">{{ translate('默认语言') }}</span>
        <span v-else class="drawer-edit-langbar__tip">{{ translate('当前仅维护') }}「{{ stateCurLangName }}」{{ translate('，其余语言数据保持不变') }}</span>
      </div>
      <!-- 基本信息：与语言无关的单值字段 -->
      <el-divider content-position="left">{{ translate('基本信息') }}</el-divider>
      <el-row :gutter="16">
        <el-col :span="24">
          <el-form-item :label="translate('关联标准')" prop="product_id">
            <el-select v-model="editForm.product_id" filterable remote reserve-keyword :placeholder="translate('输入标准名称搜索')"
              :remote-method="remoteProductMethod" remote-show-suffix :loading="state.loading" style="width: 100%">
              <el-option v-for="item in state.productsOptions" :key="`product${item.value}`" :label="item.label"
                :value="item.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="translate('启用')" prop="status">
            <el-switch v-model="editForm.status" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item :label="translate('标题')" prop="titles">
        <el-input v-model.trim="(editForm.titles || {})[stateCurLang]" clearable :placeholder="translate('标题')" />
        <div v-if="stateCurLang !== state.defaultLang && !((editForm.titles || {})[state.defaultLang])"
          class="drawer-edit-hint">{{ translate('默认语言') }}「{{ stateDefaultLangName }}」{{ translate('标题必填，未填写时请先切换维护默认语言') }}</div>
      </el-form-item>
      <el-divider content-position="left">{{ translate('详细内容') }}</el-divider>
      <div class="drawer-edit-editor">
        <docs-md-edit
          :ref="(el: any) => { if (el) editorRef[stateCurLang] = el; else delete editorRef[stateCurLang] }"
          :key="stateCurLang" :detail="(editForm.detail || {})[stateCurLang]" :language="stateCurLang"
          @update-from="watchEditor" />
      </div>
      <el-divider content-position="left">{{ translate('设置') }}{{ translate('关键词') }}</el-divider>
      <el-form-item :label="translate('新增')" prop="keywords">
        <el-input v-model="templateForm.keyword" clearable :placeholder="translate('关键词')">
          <template #prepend>
            <el-select v-model.trim="templateForm.file" style="min-width: 500px" filterable remote reserve-keyword
              :placeholder="translate('输入标准名称搜索')" :remote-method="remoteDocsMethod" remote-show-suffix :loading="state.loading"
              @change="changeDocs">
              <el-option v-for="item in state.docsOptions" :key="`doc${item.value}`" :label="item.label"
                :value="item.value" />
            </el-select>
          </template>
          <template #append>
            <el-button :icon="Plus" :disabled="!templateForm.title && !templateForm.file"
              @click="confirmKeywords(stateCurLang)" />
          </template>
        </el-input>
      </el-form-item>
      <el-form-item v-for="(keyItem, keyIndex) in (editForm.keywords || {})[stateCurLang] || []" :key="keyIndex">
        <el-form-item :label="translate('关键词')">
          <el-text type="primary">{{ keyItem.keyword }}</el-text>
        </el-form-item>
        <el-form-item :label="translate('关联文件')">
          <el-text type="primary">{{ keyItem.file }}</el-text>
          <el-button :icon="Delete" link size="small"
            @click="deleteKeywords(stateCurLang, Number(keyIndex))">{{ translate('删除') }}</el-button>
        </el-form-item>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('取 消') }}</el-button>
      <el-button v-permissions="{ permission: ['standardsCapabilitiesInterpretations:write'] }" v-debounce="save"
        :disabled="!(state.allow && state.haveModification)" :icon="Check" :loading="state.submit" type="primary">
        {{ translate('确定') }}
      </el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { useAclStore } from '/@/store/modules/acl'
import { Check, Close, Delete, Plus } from '@element-plus/icons-vue'
import { interpretationsDetail, interpretationsSave } from '/@/api/interpretations'
import { productsList } from '/@/api/products'
import { docsList } from '/@/api/docs'
import { getStorage, setStorage } from '/@/utils/storage'
import { hasAnyKeyWithValue, compareObjects } from '/@/utils/formVerification'
import { ElMessageBox, ElMessage, ElLoading } from 'element-plus'

/* 组件模板名称 */
const templateName = 'StandardsCapabilitiesInterpretationsEdit'

/* 定义组件选项 */
defineOptions({
  name: templateName, // 注册组件名称，用于调试和keep-alive缓存标识
})

/* 权限和语言相关状态 */
const aclStore = useAclStore()
const { languages, defaultItem } = storeToRefs(aclStore) // 解构多语言列表响应式引用

/** 接口语言列表（兼容数组 / Record<code,{code,name}> 两种返回形态） */
const stateLangOptions = computed<any[]>(() => {
  const dict = languages.value
  if (Array.isArray(dict)) return dict.filter((item: any) => item && item.code)
  if (dict && typeof dict === 'object') return Object.values(dict).filter((item: any) => item && item.code)
  return []
})

/** 默认语言展示名 */
const stateDefaultLangName = computed(() => {
  const target = stateLangOptions.value.find((item: any) => item.code === state.defaultLang)
  return target ? target.name : state.defaultLang
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

/**
 * 维护语言下拉 v-model：切换前将当前语言脏键处理并写回编辑器，再切换维护语言
 */
const editLangModel = computed({
  get: () => stateCurLang.value,
  set: (v: string) => {
    if (!v || v === stateCurLang.value) return
    flushEditorDetail()
    sanitizeLangContent()
    aclStore.setCurrentLang(v)
    checkAllow()
  },
})

/**
 * 清理多语言字段的脏键
 * @description 空内容且非默认语言时删除 titles/detail 键位，避免提交空 key 脏数据；
 * 默认语言空内容由必填校验兜底，保留键位让表单可恢复；keywords 保留空数组维持接口契约
 */
const sanitizeLangContent = () => {
  const titleLangs: string[] = Object.keys(editForm.value.titles || {})
  titleLangs.forEach((lang: string) => {
    if (lang === state.defaultLang) return
    const title = (editForm.value.titles || {})[lang]
    if (title === undefined || title === null || !String(title).trim()) delete editForm.value.titles[lang]
  })
  const detailLangs: string[] = Object.keys(editForm.value.detail || {})
  detailLangs.forEach((lang: string) => {
    if (lang === state.defaultLang) return
    const detail = (editForm.value.detail || {})[lang]
    if (detail === undefined || detail === null || !String(detail).trim()) delete editForm.value.detail[lang]
  })
}

/**
 * 语言标签宽度估算
 * @description el-form label-width 固定 80px 放不下“名称（中文简体）”等长标签，会折行错位；
 * 按字符估算宽度（CJK≈14px、半角≈7px，label 字体 14px），保留 24px 余量保证单行不截断。
 */
const langLabelWidth = (langName: string) => {
  const text = `名称（${langName}）`
  const width = Array.from(text).reduce((w, ch) => {
    const code = ch.charCodeAt(0)
    return w + (code > 0x2e7f || (code >= 0x3000 && code <= 0x303f) ? 14 : 7)
  }, 0)
  return `${Math.ceil(width + 24)}px`
}

/**
 * 切换维护语言前同步当前编辑器内容
 * @description 编辑器随 :key 重建前先把旧语言的最新内容写回 editForm，
 * 空内容且非默认语言时删除键位避免提交脏数据
 */
const flushEditorDetail = () => {
  const lang = stateCurLang.value
  const editor = editorRef[lang]
  if (editor && typeof editor.getDetail === 'function') {
    const value = editor.getDetail()
    const detail = (editForm.value.detail = (editForm.value.detail || {}))
    if (value && String(value).trim()) detail[lang] = value
    else if (lang !== state.defaultLang) delete detail[lang]
  }
}

/** 抽屉标题：带当前对象名称上下文 */
const drawerTitleText = computed(() => {
  const f = editForm.value || {}
  const name = textOfNames(f.titles)
  const parts = [name].filter((v) => String(v).trim() !== '')
  return parts.length ? `${state.title}: [${parts.join(' ')}]` : state.title
})

/* 编辑器相关引用 */
const editorRef: Record<string, any> = {} // 编辑器实例的引用集合
const formRef = ref<any>(null)  // 表单组件引用

/* 事件和全局方法 */
const emit = defineEmits(['fetch-data']) // 定义组件事件
const $baseMessage = inject<any>('$baseMessage') // 注入全局消息提示方法

/* 核心响应式状态 */
const state = reactive<any>({
  title: '', // 对话框标题
  drawerdFormVisible: false, // 表单抽屉可见状态
  defaultLang: defaultItem.value.languages || 'zh-cn', // 默认语言编码
  isCreate: true, // 是否为创建模式
  submit: false, // 表单提交状态
  allow: false, // 是否允许提交
  haveModification: false, // 存在未保存修改标志
  loading: false, // 数据加载状态
  productsOptions: [],
  docsOptions: [],
  fromRules: { // 表单验证规则
    titles: [{ required: true, trigger: 'blur', message: translate('请填写文件名称') }],
    product_id: [{ required: true, trigger: 'blur', message: translate('请填上传文件') }],
    patcredith: [{ required: true, trigger: 'blur', message: translate('请设置下载积分') }],
  },
  fromData: { // 表单初始数据结构
    id: null,
    titles: {},
    product_id: '',
    detail: { "zh-cn": "" },
    keywords: {},
    status: 1,
  },
})

/* 编辑表单数据模型 */
const editForm = ref<any>({ ...state.fromData })
const sourceForm = ref<any>({ ...state.fromData })

/**
 * 验证表单允许提交状态
 * @description 通过表单验证和内容比对控制允许提交状态
 */
const checkAllow = () => {
  state.haveModification = !compareObjects(editForm.value, sourceForm.value)
  if (formRef.value) {
    formRef.value.validate(async (valid: any) => {
      state.allow = !!valid
    })
  }
}

/**
 * 获取文章详情数据
 * @param {number} id - 文章ID
 * @returns {Promise<object>} 文章详情数据
 */
const fetchData = async (id: any) => {
  if (state.loading) return
  state.loading = true
  const { data } = await interpretationsDetail({ id: id || 0 })
  state.loading = false
  return data
}

const templateForm = reactive<any>({
  id: '',
  file: '',
  keyword: '',
})
const confirmKeywords = (language: string) => {
  const label: any = {
    keyword: translate('关键词'),
    file: translate('关联文件'),
    id: translate('关联文件编号'),
  }
  for (var key in templateForm) {
    if (!templateForm[key]) {
      ElMessage.error(`${label[key]}${translate('不能为空')}`)
      return
    }
  }
  if (!editForm.value.keywords[language]) editForm.value.keywords[language] = []
  editForm.value.keywords[language].push({
    id: templateForm.id,
    file: templateForm.file,
    keyword: templateForm.keyword,
  })
  templateForm.id = ''
  templateForm.file = ''
  templateForm.keyword = ''
}
const deleteKeywords = (language: string, index: number) => {
  if (editForm.value.keywords[language]) editForm.value.keywords[language].splice(index, 1)
}
const changeDocs = (value: any) => {
  console.log('value:', value)
  const docArray = state.docsOptions.find((item: any) => item.value === value)
  templateForm.id = docArray.value
  templateForm.file = docArray.label
}
const remoteProductMethod = async (query: string) => {
  if (state.loading) return
  state.loading = true
  if (query) {
    state.productsOptions = [];
    const { data } = await productsList({ filter: { keywords: query }, page: 1, pageSize: 10 })
    if (data?.total > 0 && data?.list.length > 0) {
      state.productsOptions = data?.list.map((item: any) => ({
        label: `${item.standard}${item.grade ? '/' : ''}${item.grade} ${item.code}-${item.year} ${textOfNames(item.names)}`,
        value: item.id
      }))
    }
  } else {
    state.productsOptions.value = []
  }
  state.loading = false
}

const remoteDocsMethod = async (query: string) => {
  if (state.loading) return
  state.loading = true
  if (query) {
    state.docsOptions = [];
    const { data } = await docsList({ filter: { keywords: query }, page: 1, pageSize: 10 })
    if (data?.total > 0 && data?.list.length > 0) {
      state.docsOptions = data?.list.map((item: any) => ({
        label: item.title || '',
        value: item.id
      }))
    }
  } else {
    state.docsOptions.value = []
  }
  state.loading = false
}

// 监听编辑器内容变化
const watchEditor = (row: any) => {
  if (row.language) {
    const detail = (editForm.value.detail = (editForm.value.detail || {}))
    // 有内容写回；空内容且非默认语言时删除键位，避免把空 key 提交成脏数据
    if (row.detail && String(row.detail).trim()) detail[row.language] = row.detail
    else if (row.language !== state.defaultLang) delete detail[row.language]
  }
  checkAllow()
}

/**
 * 显示编辑对话框核心逻辑
 * @param {object|null} row - 行数据对象（null时为新建模式）
 * @description 处理新建/编辑模式初始化逻辑，包含草稿加载功能
 */
const showEdit = async (row: any) => {
  const loadingInstance = ElLoading.service({ fullscreen: true });
  const initializeForm = (baseData: any, extendData?: any) => {
    sourceForm.value = JSON.parse(JSON.stringify({ ...baseData, ...(extendData || {}) }));
    editForm.value = JSON.parse(JSON.stringify(sourceForm.value));
    open();
    loadingInstance.close();
  }

  if (!row) {
    state.isCreate = true
    state.title = translate('添加')
    const lastFormData = getStorage('lastFormData') || {}

    // 草稿加载确认流程
    if (lastFormData[templateName]) {
      loadingInstance.close();
      ElMessageBox.confirm(translate('检测到有未保存的草稿。您想要加载此草稿继续编辑吗？如果选择不加载，当前草稿将会被清空。'), {
        draggable: false,
        cancelButtonText: translate('放弃草稿'),
        confirmButtonText: translate('加载'),
      }).then(async () => {
        initializeForm(state.fromData, lastFormData[templateName])
      }).catch(() => {
        cleanLastFormData()
        initializeForm(state.fromData)
      })
    } else {
      initializeForm(state.fromData)
    }
  } else {
    state.isCreate = false
    state.title = translate('编辑')
    const detailRow = await fetchData(row.id);
    const productRow = detailRow?.product || null;
    if (productRow) {
      state.productsOptions = [
        {
          label: `${productRow.standard}${productRow.grade ? '/' : ''}${productRow.grade} ${productRow.code}-${productRow.year} ${textOfNames(productRow.names)}`,
          value: productRow.id
        }
      ];
    }
    initializeForm(state.fromData, { ...row, ...detailRow })
  }
}

// 暴露组件方法
defineExpose({ showEdit })

/**
 * 保存表单草稿数据
 * @description 在localStorage中存储未提交的表单数据
 */
const setLastFormData = () => {
  if (state.isCreate) {
    const lastFormData = getStorage('lastFormData') || {}
    if (!compareObjects(editForm.value, sourceForm.value)) {
      lastFormData[templateName] = JSON.parse(JSON.stringify(editForm.value))
    } else {
      delete lastFormData[templateName]
    }
    setStorage('lastFormData', lastFormData)
  }
}

/**
 * 清理草稿数据
 */
const cleanLastFormData = () => {
  const lastFormData = getStorage('lastFormData') || {}
  delete lastFormData[templateName]
  setStorage('lastFormData', lastFormData)
}

/**
 * 处理对话框关闭逻辑
 * @description 包含未保存修改确认流程
 */
const handleClose = async () => {
  if (!state.drawerdFormVisible) return
  if (state.haveModification) {
    ElMessageBox.confirm(translate('您确定要放弃修改吗？'), {
      draggable: false,
    }).then(async () => {
      close()
    }).catch(() => { /* 取消关闭操作 */ })
  } else {
    close()
  }
}

// 对话框控制方法
const open = () => { state.drawerdFormVisible = true }
const close = async () => { state.drawerdFormVisible = false }

/**
 * 保存表单核心逻辑
 * @description 处理表单提交和结果反馈
 */
const save = () => {
  if (state.submit) return
  state.submit = true

  formRef.value.validate(async (valid: any) => {
    if (valid) {
      flushEditorDetail()
      sanitizeLangContent()
      const { msg }: any = await interpretationsSave(editForm.value)
      formRef.value.resetFields()
      sourceForm.value = JSON.parse(JSON.stringify(state.fromData))
      editForm.value = JSON.parse(JSON.stringify(state.fromData))
      cleanLastFormData()
      $baseMessage(msg, 'success', 'hey')
      emit('fetch-data')
      close()
    }
    state.submit = false
  })
}

/**
 * 监听表单变化处理器
 * @description 深度监听编辑表单变化，触发允许提交检查和草稿保存
 */
watch(
  editForm,
  () => {
    if (!state.submit) {
      checkAllow()
      setLastFormData()
    }
  },
  { deep: true, immediate: false } // 深度监听，非立即触发
)

const init = () => {
  // if (props.config.url && props.config.url !== '') {
  //   player.value = new Player(props.config)
  //   emit('player', player.value)
  // }
}

/* 生命周期钩子 */
onMounted(() => { init() })
onBeforeUnmount(() => { /* 组件卸载前清理逻辑 */ })
onBeforeMount(() => {
  editForm.value && typeof editForm.value.destroy === 'function' && editForm.value.destroy()
  sourceForm.value && typeof sourceForm.value.destroy === 'function' && sourceForm.value.destroy()
  editorRef.value && typeof editorRef.value.destroy === 'function' && editorRef.value.destroy()
})
</script>

<style lang="scss" scoped>

/* 三段式抽屉共用样式 */
.drawer-edit-form {
  padding: 0 4px;

  .drawer-edit-hint {
    width: 100%;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 18px;
  }

  .drawer-edit-langbar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    padding: 8px 12px;
    border: 1px solid var(--el-border-color-lighter, #ebeef5);
    border-radius: var(--el-border-radius-base, 4px);
    background: var(--el-fill-color-light, #f5f7fa);

    .drawer-edit-langbar__label {
      flex: none;
      color: var(--el-text-color-regular);
      font-size: 13px;
    }

    .drawer-edit-langbar__select {
      flex: none;
      width: 180px;
    }

    .drawer-edit-langbar__badge {
      flex: none;
      padding: 1px 8px;
      color: var(--el-color-success);
      font-size: 12px;
      border: 1px solid var(--el-color-success-light-5, #b3e19d);
      border-radius: 999px;
    }

    .drawer-edit-langbar__tip {
      color: var(--el-text-color-secondary);
      font-size: 12px;
    }
  }

  .drawer-edit-editor {
    .drawer-edit-editor-label {
      color: var(--el-text-color-regular);
      font-size: 14px;
      line-height: 32px;
      margin-bottom: 4px;
    }

    .md-editor-container,
    :deep(.v-md-editor) {
      width: 100%;
    }
  }

  :deep(.el-divider--horizontal) {
    margin: 18px 0 16px;

    &:first-of-type {
      margin-top: 4px;
    }
  }
}
</style>
