<!--
 * @Author: trexwb
 * @Date: 2024-01-26 10:16:38
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-04-30 12:13:54
 * @FilePath: /console/web/src/views/standards/products/vabAutoComponents/ProductsShapesEdit.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2024 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-drawer v-model="state.drawerdFormVisible" append-to-body :before-close="handleClose" direction="rtl" size="50%"
    :title="drawerTitleText">
    <el-form ref="formRef" label-width="80px" :model="editForm" :rules="state.fromRules" class="shapes-edit-form">
      <!-- 维护语言切换：仅显示/维护当前语言内容，保存仍提交全部语言数据 -->
      <div v-if="stateLangOptions.length > 0" class="shapes-edit-langbar">
        <span class="shapes-edit-langbar__label">{{ translate('维护语言') }}</span>
        <el-select v-model="editLangModel" class="shapes-edit-langbar__select" size="default">
          <el-option v-for="lang in stateLangOptions" :key="lang.code" :label="lang.name"
            :value="lang.code" />
        </el-select>
        <span v-if="stateCurLang === state.defaultLang" class="shapes-edit-langbar__badge">{{ translate('默认语言') }}</span>
        <span v-else class="shapes-edit-langbar__tip">{{ translate('当前仅维护') }}「{{ stateCurLangName }}」{{ translate('，其余语言数据保持不变') }}</span>
      </div>
      <!-- 基本信息：与语言无关的单值字段，栅格双列 -->
      <el-divider content-position="left">{{ translate('基本信息') }}</el-divider>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item :label="translate('位置')" prop="location">
            <el-select v-model="editForm.location" clearable :placeholder="translate('请选择位置')" style="width: 100%">
              <el-option v-for="(item, key) in (configuration.shape || [])" :key="`shape[${key}]`"
                :label="item['zh-cn']" :value="Number(key)" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="translate('缩写')" prop="abbreviation">
            <el-input v-model="editForm.abbreviation" clearable :placeholder="translate('缩写或者拼音，主要用于短词搜索')" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="translate('排序')" prop="sort">
            <el-input-number v-model.trim="editForm.sort" :max="999" :min="0" clearable
              :placeholder="translate('从小到大自然排序（0在最后）')" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="translate('启用')" prop="status">
            <el-switch v-model="editForm.status" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="translate('图标')" prop="covers">
            <products-upload :limit="1" :files="editForm.covers || []" accept="image/*"
              @change-files="changeFiles"></products-upload>
            <div class="shapes-edit-hint">{{ translate('仅支持jpg、png图片，建议小于10k的正方形图片') }}</div>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item :label="translate('名称')" prop="names">
        <el-input v-model.trim="(editForm.names || {})[stateCurLang]" clearable
          :placeholder="`${translate('请输入')}${stateCurLangName}${translate('名称')}`" />
        <div v-if="stateCurLang !== state.defaultLang && !((editForm.names || {})[state.defaultLang])"
          class="shapes-edit-hint">{{ translate('默认语言') }}「{{ stateDefaultLangName }}」{{ translate('名称必填，未填写时请先切换维护默认语言') }}</div>
      </el-form-item>
      <div class="shapes-edit-editor">
        <div class="shapes-edit-editor-label">{{ translate('详细说明') }}</div>
        <products-md-edit :ref="(el: any) => { if (el) editorRef[stateCurLang] = el; else delete editorRef[stateCurLang] }"
          :key="stateCurLang" :detail="(editForm.remarks || {})[stateCurLang]" :language="stateCurLang"
          @update-from="watchEditor" />
      </div>

      <!-- 体积公式：最小/最大 双槽位 -->
      <el-divider content-position="left">{{ translate('体积公式（最小 / 最大）') }}</el-divider>
      <div class="shapes-formulas-editor">
        <template v-if="editForm.id">
          <div v-loading="state.formulasLoading" class="shapes-formulas-single">
            <div v-for="slot in formulaSlots" :key="`formulaSlot[${slot.variant}]`" class="shapes-formula-slot">
              <div class="shapes-formula-slot-label">{{ slot.label }}</div>
              <div v-if="shapeFormulasByVariant[slot.variant]" class="shapes-formula-card">
                <div class="shapes-formula-meta">
                  <el-tag size="small" type="info">{{ shapeFormulasByVariant[slot.variant].code }}</el-tag>
                  <span class="shapes-formula-name">{{ textOfNames(shapeFormulasByVariant[slot.variant].names) || '—' }}</span>
                  <el-tag :type="shapeFormulasByVariant[slot.variant].status === 1 ? 'success' : 'info'" size="small">{{ shapeFormulasByVariant[slot.variant].status ===
                    1 ? translate('启用') : translate('禁用') }}</el-tag>
                </div>
                <code class="shapes-formula-expr">{{ shapeFormulasByVariant[slot.variant].columnar }}</code>
                <div class="shapes-formula-actions">
                  <el-button v-permissions="{ permission: ['standardsFormulas:write'] }" :icon="Edit" size="small" text
                    type="primary" @click="editShapeFormula(shapeFormulasByVariant[slot.variant])">{{ translate('编辑') }}</el-button>
                  <el-button v-permissions="{ permission: ['standardsFormulas:delete'] }" :icon="Delete" size="small"
                    text type="danger" @click="deleteShapeFormula(shapeFormulasByVariant[slot.variant])">{{ translate('删除') }}</el-button>
                </div>
              </div>
              <div v-else class="shapes-formula-empty">
                <el-button v-permissions="{ permission: ['standardsFormulas:write'] }" :icon="Plus" size="small"
                  type="primary" plain @click="addShapeFormula(slot.variant)">{{ translate('添加') }}{{ slot.label }}</el-button>
              </div>
            </div>
            <template v-if="otherFormulas.length">
              <el-divider content-position="left">{{ translate('未标记变体的公式') }}</el-divider>
              <div v-for="row in otherFormulas" :key="`other[${row.id}]`" class="shapes-formula-card">
                <div class="shapes-formula-meta">
                  <el-tag size="small" type="info">{{ row.code }}</el-tag>
                  <span class="shapes-formula-name">{{ textOfNames(row.names) || '—' }}</span>
                  <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? translate('启用') : translate('禁用')
                  }}</el-tag>
                </div>
                <code class="shapes-formula-expr">{{ row.columnar }}</code>
                <div class="shapes-formula-actions">
                  <el-button v-permissions="{ permission: ['standardsFormulas:write'] }" :icon="Edit" size="small" text
                    type="primary" @click="editShapeFormula(row)">{{ translate('编辑') }}</el-button>
                  <el-button v-permissions="{ permission: ['standardsFormulas:delete'] }" :icon="Delete" size="small"
                    text type="danger" @click="deleteShapeFormula(row)">{{ translate('删除') }}</el-button>
                </div>
              </div>
            </template>
            <div class="shapes-formulas-footer">
              <span class="shapes-formulas-vars">
                {{ translate('每个形状维护「体积最小 / 体积最大」两条公式（修改即时保存，系统自动标记 extension.variant，code 建议 V 开头）；前台与其他属性计算通过这两条结果取最小/最大值。全局中间变量在形状列表页「中间变量」中维护。') }}
              </span>
            </div>
          </div>
        </template>
        <el-alert v-else type="info" :closable="false" show-icon :title="translate('保存形状后，可在此维护该形状的体积公式')" />
      </div>
      <calculations-formulas-edit ref="formulasEditRef" @fetch-data="onFormulaSaved" />
    </el-form>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('取 消') }}</el-button>
      <el-button v-permissions="{ permission: ['standardsShapes:write'] }" v-debounce="save"
        :disabled="!(state.allow && state.haveModification)" :icon="Check" :loading="state.submit" type="primary">
        {{ translate('确定') }}
      </el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { useAclStore } from '/@/store/modules/acl'
import { Check, Close, Delete, Edit, Plus } from '@element-plus/icons-vue'
import { shapesDetail, shapesSave } from '/@/api/shapes'
import { getStorage, setStorage } from '/@/utils/storage'
import { hasAnyKeyWithValue, compareObjects } from '/@/utils/formVerification'
import { ElMessageBox, ElLoading } from 'element-plus'
import { formulasAll, formulasDelete } from '/@/api/formulas'

/* 组件模板名称 */
const templateName = 'StandardsProductsShapesEdit'

/* 定义组件选项 */
defineOptions({
  name: templateName, // 注册组件名称，用于调试和keep-alive缓存标识
})

/* 权限和语言相关状态 */
const aclStore = useAclStore()
const { configuration, languages, defaultItem } = storeToRefs(aclStore) // 解构多语言列表响应式引用

/* 编辑器相关引用 */
const editorRef: Record<string, any> = {} // 编辑器实例的引用集合
const formRef = ref<any>(null)  // 表单组件引用
const formulasEditRef = ref<any>(null) // 公式编辑抽屉（复用 CalculationsFormulasEdit）

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
  formulasLoading: false, // 体积公式加载中
  shapeFormulas: [] as any[], // 当前形状关联的体积公式（formulas 表，shape_id 关联）
  allow: false, // 是否允许提交
  haveModification: false, // 存在未保存修改标志
  loading: false, // 数据加载状态
  fromRules: { // 表单验证规则
    names: [{
      trigger: 'blur',
      validator: (_rule: any, _value: any, callback: any) => {
        const name = (editForm.value.names || {})[state.defaultLang]
        if (name && String(name).trim()) callback()
        else callback(new Error(translate('请填写默认语言名称')))
      },
    }],
    abbreviation: [{ required: true, trigger: 'blur', message: translate('请填写分类缩写') }],
  },
  fromData: { // 表单初始数据结构
    id: null,
    names: {},
    abbreviation: '',
    remarks: {},
    covers: [],
    extension: {},
    sort: 0,
    status: 1,
  },
})

/* 编辑表单数据模型 */
const editForm = ref<any>({ ...state.fromData })
const sourceForm = ref<any>({ ...state.fromData })

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
 * 编辑器随 :key 重建前先把旧语言的最新内容写回 editForm，
 * 空内容且非默认语言时删除键位避免提交脏数据
 */
const flushEditorDetail = () => {
  const lang = stateCurLang.value
  const editor = editorRef[lang]
  if (editor && typeof editor.getDetail === 'function') {
    const value = editor.getDetail()
    const remarks = (editForm.value.remarks = (editForm.value.remarks || {}))
    if (value && String(value).trim()) remarks[lang] = value
    else if (lang !== state.defaultLang) delete remarks[lang]
  }
}

/**
 * 清理多语言字段的脏键
 * @description 空内容且非默认语言时删除键位，避免提交空 key 脏数据；
 * 默认语言空内容由必填校验兜底，保留键位让表单可恢复
 */
const sanitizeLangContent = () => {
  const langs: string[] = Object.keys(editForm.value.names || {})
  langs.forEach((lang: string) => {
    if (lang === state.defaultLang) return
    const name = (editForm.value.names || {})[lang]
    if (name === undefined || name === null || !String(name).trim()) delete editForm.value.names[lang]
    const remark = (editForm.value.remarks || {})[lang]
    if (remark === undefined || remark === null || !String(remark).trim()) delete editForm.value.remarks[lang]
  })
}

/**
 * 维护语言下拉 v-model：切换时写入全局并持久化
 * @description 切换前把旧语言编辑器内容 flush 回 editForm，
 * 再切换 stateCurLang，后续字段/编辑器 v-model 即指向新语言键位
 */
const editLangModel = computed({
  get: () => stateCurLang.value,
  set: (v: string) => {
    if (!v || v === stateCurLang.value) return
    flushEditorDetail()
    aclStore.setCurrentLang(v)
    checkAllow()
  },
})

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

/** 抽屉标题：带当前对象名称上下文 */
const drawerTitleText = computed(() => {
  const f = editForm.value || {}
  const name = textOfNames(f.names)
  const parts = [String(f.abbreviation || '').trim(), name].filter((v) => String(v).trim() !== '')
  return parts.length ? `${state.title}: [${parts.join(' ')}]` : state.title
})

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
  const { data } = await shapesDetail({ id: id || 0 })
  state.loading = false
  return data
}

/**
 * 显示编辑对话框核心逻辑
 * @param {object|null} row - 行数据对象（null时为新建模式）
 * @description 处理新建/编辑模式初始化逻辑，包含草稿加载功能
 */
const showEdit = async (row: any) => {
  const loadingInstance = ElLoading.service({ fullscreen: true });
  const initializeForm = (baseData: any, extendData?: any) => {
    sourceForm.value = JSON.parse(JSON.stringify({ ...baseData, ...(extendData || {}) }))
    editForm.value = JSON.parse(JSON.stringify(sourceForm.value))
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
    const detailRow = await fetchData(row.id)
    initializeForm(state.fromData, { ...row, ...detailRow })
  }
  fetchShapeFormulas()
}

// 暴露组件方法
defineExpose({ showEdit })

/**
 * 处理文件上传变化
 * @param {Array} uploadFiles - 上传文件数组
 */
const changeFiles = (uploadFiles: any, uploadName?: string) => {
  editForm.value[uploadName || 'covers'] = uploadFiles.map((item: any) => ({
    name: item.name || '',
    url: item.url || ''
  }))
  checkAllow()
}

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
      const { msg }: any = await shapesSave(editForm.value)
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

// 监听编辑器内容变化
const watchEditor = (row: any) => {
  if (row.language) {
    editForm.value.remarks[row.language] = row.detail
  }
  checkAllow()
}

/* ===== 体积公式（formulas 表 · shape_id 关联当前形状，最小/最大 双变体）维护 ===== */
// 双变体槽位：体积最小 / 体积最大（extension.variant 标记）
const formulaSlots: Array<{ variant: 'min' | 'max'; label: string }> = [
  { variant: 'min', label: translate('体积最小') },
  { variant: 'max', label: translate('体积最大') },
]
const shapeFormulasByVariant = computed(() => ({
  min: state.shapeFormulas.find((item: any) => item.extension?.variant === 'min') || null,
  max: state.shapeFormulas.find((item: any) => item.extension?.variant === 'max') || null,
}))
const otherFormulas = computed(() =>
  state.shapeFormulas.filter((item: any) => !['min', 'max'].includes(item.extension?.variant)),
)

/**
 * 拉取当前形状关联的体积公式：formulasAll 全量后按 shape_id 前端过滤
 */
const fetchShapeFormulas = async () => {
  if (!editForm.value?.id) {
    state.shapeFormulas = []
    return
  }
  state.formulasLoading = true
  try {
    const { data }: any = await formulasAll()
    const list = Array.isArray(data) ? data : data?.list || []
    state.shapeFormulas = list.filter((item: any) => Number(item.shape_id) === Number(editForm.value.id))
  } finally {
    state.formulasLoading = false
  }
}

/** 形状编辑抽屉带入的锁定形状（新建公式时直接关联当前形状） */
const presetShape = () => ({
  id: editForm.value.id,
  location: editForm.value.location,
  name: textOfNames(editForm.value.names) || '',
})

const addShapeFormula = (variant: string) => {
  formulasEditRef.value?.showEdit(null, { ...presetShape(), variant })
}

const editShapeFormula = (row: any) => {
  formulasEditRef.value?.showEdit(row, { ...presetShape(), variant: row.extension?.variant })
}

const deleteShapeFormula = (row: any) => {
  ElMessageBox.confirm(`确定删除公式「${textOfNames(row.names) || row.code}」吗？`, translate('提示'), {
    draggable: true,
    type: 'warning',
  }).then(async () => {
    await formulasDelete({ id: [row.id] })
    $baseMessage(translate('删除成功'), 'success', 'hey')
    fetchShapeFormulas()
  }).catch(() => { /* 取消删除 */ })
}

/** 公式保存/删除后刷新列表并通知列表页刷新公式计数 */
const onFormulaSaved = () => {
  fetchShapeFormulas()
  emit('fetch-data')
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
})
</script>

<style lang="scss" scoped>
.shapes-edit-form {
  padding: 0 4px;

  .shapes-edit-hint {
    width: 100%;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 18px;
  }

  .shapes-edit-langbar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    padding: 8px 12px;
    border: 1px solid var(--el-border-color-lighter, #ebeef5);
    border-radius: var(--el-border-radius-base, 4px);
    background: var(--el-fill-color-light, #f5f7fa);

    .shapes-edit-langbar__label {
      flex: none;
      color: var(--el-text-color-regular);
      font-size: 13px;
    }

    .shapes-edit-langbar__select {
      flex: none;
      width: 180px;
    }

    .shapes-edit-langbar__badge {
      flex: none;
      padding: 1px 8px;
      color: var(--el-color-success);
      font-size: 12px;
      border: 1px solid var(--el-color-success-light-5, #b3e19d);
      border-radius: 999px;
    }

    .shapes-edit-langbar__tip {
      color: var(--el-text-color-secondary);
      font-size: 12px;
    }
  }

  .shapes-edit-editor {
    .shapes-edit-editor-label {
      color: var(--el-text-color-regular);
      font-size: 14px;
      line-height: 32px;
      margin-bottom: 4px;
    }

    // 编辑器通栏铺满，避免被表单标签列挤压
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

.shapes-formulas-editor {
  padding: 0 0 8px;

  .shapes-formula-slot {
    margin-bottom: 12px;

    .shapes-formula-slot-label {
      color: var(--el-text-color-regular);
      font-size: 13px;
      font-weight: 600;
      line-height: 28px;
    }

    .shapes-formula-empty {
      padding: 8px 0;
      border: 1px dashed var(--el-border-color);
      border-radius: 8px;
      text-align: center;
    }
  }

  .shapes-formula-card {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    padding: 12px 14px;
    background: var(--el-fill-color-lighter);

    .shapes-formula-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;

      .shapes-formula-name {
        font-weight: 600;
      }
    }

    .shapes-formula-expr {
      display: block;
      padding: 8px 10px;
      border: 1px dashed var(--el-border-color);
      border-radius: 6px;
      background: var(--el-bg-color);
      font-family: 'SF Mono', Menlo, Consolas, monospace;
      font-size: 12.5px;
      word-break: break-all;
      line-height: 1.6;
    }

    .shapes-formula-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
  }

  .shapes-formulas-footer {
    margin-top: 10px;

    .shapes-formulas-vars {
      color: var(--el-text-color-secondary);
      font-size: 12px;
      line-height: 20px;
    }
  }

  .shapes-edit-hint {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 18px;
  }
}
</style>
