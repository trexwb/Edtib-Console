<!--
 * @Author: trexwb
 * @Date: 2024-01-26 10:16:38
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-04-30 12:13:06
 * @FilePath: /console/web/src/views/standards/products/vabAutoComponents/ProductsCategoriesEdit.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2024 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-drawer v-model="state.drawerdFormVisible" append-to-body :before-close="handleClose" direction="rtl" size="50%"
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
          <el-form-item :label="translate('上级分类')" v-if="state.categorieOptions.length > 0">
            <el-cascader v-model="parentIds" clearable filterable :options="state.categorieOptions"
              :props="{ label: 'label', value: 'id', checkStrictly: true }" :show-all-levels="true" style="width: 100%">
              <template #default="{ node, data }">
                <span>{{ textOfNames(data.names) }}</span>
                <span v-if="!node.isLeaf"> ({{ data.children.length }}) </span>
              </template>
            </el-cascader>
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
            <div class="drawer-edit-hint">{{ translate('仅支持jpg、png图片，建议小于10k的正方形图片') }}</div>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item :label="translate('名称')" prop="names">
        <el-input v-model.trim="(editForm.names || {})[stateCurLang]" clearable
          :placeholder="`${translate('请输入')}${stateCurLangName}${translate('名称')}`" />
        <div v-if="stateCurLang !== state.defaultLang && !((editForm.names || {})[state.defaultLang])"
          class="drawer-edit-hint">{{ translate('默认语言') }}「{{ stateDefaultLangName }}」{{ translate('名称必填，未填写时请先切换维护默认语言') }}</div>
      </el-form-item>
      <el-form-item :label="translate('备注')" prop="remarks">
        <el-input v-model="(editForm.remarks || {})[stateCurLang]" type="textarea" :rows="5" clearable
          :placeholder="`${translate('请输入')}${stateCurLangName}${translate('备注')}`" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('取 消') }}</el-button>
      <el-button v-permissions="{ permission: ['standardsCategories:write'] }" v-debounce="save"
        :disabled="!(state.allow && state.haveModification)" :icon="Check" :loading="state.submit" type="primary">
        {{ translate('确定') }}
      </el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { useAclStore } from '/@/store/modules/acl'
import { Check, Close } from '@element-plus/icons-vue'
import { categoriesAll, categoriesDetail, categoriesSave } from '/@/api/categories'
import { getStorage, setStorage } from '/@/utils/storage'
import { hasAnyKeyWithValue, compareObjects } from '/@/utils/formVerification'
import { ElMessageBox, ElLoading } from 'element-plus'

/* 组件模板名称 */
const templateName = 'StandardsProductsCategoriesEdit'

/* 定义组件选项 */
defineOptions({
  name: templateName, // 注册组件名称，用于调试和keep-alive缓存标识
})

/* 权限和语言相关状态 */
const aclStore = useAclStore()
const { configuration, languages, defaultItem } = storeToRefs(aclStore) // 解构多语言列表响应式引用

/* 编辑器相关引用 */
const formRef = ref<any>(null)  // 表单组件引用

/* 事件和全局方法 */
const emit = defineEmits(['fetch-data']) // 定义组件事件
const $baseMessage = inject<any>('$baseMessage') // 注入全局消息提示方法

/* 核心响应式状态 */
const state = reactive<any>({
  title: '', // 对话框标题
  drawerdFormVisible: false, // 表单抽屉可见状态
  defaultLang: defaultItem.value.languages || 'zh-cn', // 默认语言编码
  categorieOptions: [],
  isCreate: true, // 是否为创建模式
  submit: false, // 表单提交状态
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
    parent_id: null,
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
const parentIds = ref<any>([])

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
 * 维护语言下拉 v-model：切换时写入全局并持久化
 * @description 切换前将多语言字段按旧语言清键/留键规则处理后保存于 editForm，
 * 再切换 stateCurLang，后续字段 v-model 即指向新语言键位
 */
const editLangModel = computed({
  get: () => stateCurLang.value,
  set: (v: string) => {
    if (!v || v === stateCurLang.value) return
    sanitizeLangContent()
    aclStore.setCurrentLang(v)
    checkAllow()
  },
})

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
  const { data } = await categoriesDetail({ id: id || 0 })
  state.loading = false
  return data
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
    if (editForm.value.parent_id) {
      parentIds.value = findParentIds(state.categorieOptions, editForm.value.id)
    }
    open()
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
      sanitizeLangContent()
      editForm.value.parent_id = parentIds.value.at(-1)
      const { msg }: any = await categoriesSave(editForm.value)
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
  parentIds.value && typeof parentIds.value.destroy === 'function' && parentIds.value.destroy()
  editForm.value && typeof editForm.value.destroy === 'function' && editForm.value.destroy()
  sourceForm.value && typeof sourceForm.value.destroy === 'function' && sourceForm.value.destroy()
  fetchCategories()
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
