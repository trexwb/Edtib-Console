<!--
 * @Author: trexwb
 * @Date: 2024-01-26 10:16:38
 * @LastEditors: ${git_name}
 * @LastEditTime: 2026-09-10 09:40:45
 * @FilePath: /fastenerTradeWorkbench/Users/wbtrex/website/localServer/node/edtib/client/console/web/src/views/standards/products/vabAutoComponents/ProductsStandardsEdit.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2024 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-drawer v-model="state.drawerdFormVisible" append-to-body :before-close="handleClose" direction="rtl" size="50%"
    :title="drawerTitleText">
    <el-alert v-if="state.hasDraft" :closable="false" class="drawer-draft-alert" show-icon type="warning">
      <template #title>
        {{ translate('已恢复上次未提交的草稿') }}
        <el-button link type="primary" @click="discardDraft">{{ translate('放弃草稿') }}</el-button>
      </template>
    </el-alert>
    <el-form ref="formRef" label-width="80px" :model="editForm" :rules="state.fromRules" class="drawer-edit-form">
      <!-- 维护语言切换：仅显示/维护当前语言内容，保存仍提交全部语言数据 -->
      <div v-if="stateLangOptions.length > 0" class="drawer-edit-langbar">
        <span class="drawer-edit-langbar__label">{{ translate('维护语言') }}</span>
        <el-select v-model="editLangModel" class="drawer-edit-langbar__select" size="default">
          <el-option v-for="lang in stateLangOptions" :key="lang.code" :label="lang.name" :value="lang.code" />
        </el-select>
        <span v-if="stateCurLang === state.defaultLang" class="drawer-edit-langbar__badge">{{ translate('默认语言') }}</span>
        <span v-else class="drawer-edit-langbar__tip">{{ translate('当前仅维护') }}「{{ stateCurLangName }}」{{ translate('，其余语言数据保持不变') }}</span>
      </div>
      <!-- 基本信息：与语言无关的单值字段 -->
      <el-divider content-position="left">{{ translate('基本信息') }}</el-divider>
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12">
          <el-form-item :label="translate('简写')" prop="abbreviation">
            <el-input v-model="editForm.abbreviation" clearable :placeholder="translate('别称，用于标准前识别')" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12">
          <el-form-item :label="translate('排序')" prop="sort">
            <el-tooltip :content="translate('按自然排序从小到大，0 永远排在最后')" placement="top">
              <el-input-number v-model="editForm.sort" :max="999" :min="0" clearable style="width: 100%" />
            </el-tooltip>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="24">
          <el-form-item :label="translate('启用')" prop="status">
            <el-switch v-model="editForm.status" :active-value="1" :inactive-value="0" :active-text="translate('启用')"
              :inactive-text="translate('禁用')" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="translate('图标')" prop="covers">
            <products-upload :limit="1" :files="editForm.covers || []" accept="image/*"
              @change-files="changeFiles"></products-upload>
            <div class="drawer-edit-hint">{{ translate('建议使用 64×64 以内的正方形图标，jpg / png 格式') }}</div>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item :label="translate('名称')" prop="names">
        <el-input v-model.trim="(editForm.names || {})[stateCurLang]" clearable
          :placeholder="`${translate('请输入')}${stateCurLangName}${translate('名称')}`" />
        <div v-if="stateCurLang !== state.defaultLang && !((editForm.names || {})[state.defaultLang])"
          class="drawer-edit-hint">{{ translate('默认语言') }}「{{ stateDefaultLangName }}」{{ translate('名称必填，未填写时请先切换维护默认语言') }}</div>
      </el-form-item>
      <el-form-item :label="translate('备注')">
        <el-input v-model="(editForm.remarks || {})[stateCurLang]" type="textarea" :rows="4" clearable
          :placeholder="`${translate('请输入')}${stateCurLangName}${translate('备注（可选）')}`" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('取 消') }}</el-button>
      <el-tooltip :disabled="state.haveModification" :content="translate('暂无修改内容')" placement="top">
        <span>
          <el-button v-permissions="{ permission: ['standardsStandards:write'] }" v-debounce="save"
            :disabled="!state.haveModification" :icon="Check" :loading="state.submit" type="primary">
            {{ translate('保存') }}
          </el-button>
        </span>
      </el-tooltip>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { useAclStore } from '/@/store/modules/acl'
import { Check, Close } from '@element-plus/icons-vue'
import { standardsDetail, standardsSave } from '/@/api/standards'
import { getStorage, setStorage } from '/@/utils/storage'
import { compareObjects } from '/@/utils/formVerification'
import { ElMessageBox, ElLoading } from 'element-plus'

/* 组件模板名称 */
const templateName = 'StandardsProductsStandardsEdit'

/* 定义组件选项 */
defineOptions({
  name: templateName, // 注册组件名称，用于调试和keep-alive缓存标识
})

/* 权限和语言相关状态 */
const aclStore = useAclStore()
const { languages, defaultItem } = storeToRefs(aclStore) // 解构多语言列表响应式引用

/* 编辑器相关引用 */
const formRef = ref<any>(null)  // 表单组件引用

/* 事件和全局方法 */
const emit = defineEmits(['fetch-data']) // 定义组件事件
const $baseMessage = inject<any>('$baseMessage') // 注入全局消息提示方法

/* 核心响应式状态 */
const state = reactive<any>({
  title: '', // 抽屉标题
  drawerdFormVisible: false, // 表单抽屉可见状态
  defaultLang: defaultItem.value.languages || 'zh-cn', // 默认语言编码
  isCreate: true, // 是否为创建模式
  submit: false, // 表单提交状态
  haveModification: false, // 存在未保存修改标志
  hasDraft: false, // 是否存在可恢复的草稿
  loading: false, // 数据加载状态
  fromRules: { // 表单验证规则
    abbreviation: [{ required: true, trigger: 'blur', message: translate('请填写标准简写') }],
    names: [
      {
        trigger: 'blur',
        validator: (_rule: any, _value: any, callback: any) => {
          const name = (editForm.value.names || {})[state.defaultLang]
          if (name && String(name).trim()) {
            callback()
          } else {
            callback(new Error(translate('请填写默认语言名称')))
          }
        },
      },
    ],
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
 * 维护语言下拉 v-model：切换前清理当前语言脏键，再切换维护语言
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
 * @description 空内容且非默认语言时删除 names/remarks 键位，避免提交空 key 脏数据；
 * 默认语言空内容由必填校验兜底，保留键位让表单可恢复
 */
const sanitizeLangContent = () => {
  ;['names', 'remarks'].forEach((field) => {
    const fieldLangs: string[] = Object.keys((editForm.value as any)[field] || {})
    fieldLangs.forEach((lang: string) => {
      if (lang === state.defaultLang) return
      const value = (editForm.value as any)[field][lang]
      if (value === undefined || value === null || !String(value).trim()) delete (editForm.value as any)[field][lang]
    })
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
  if (state.isCreate) return state.title
  const name = textOfNames(f.names)
  const parts = [name, f.abbreviation].filter((v) => v && String(v).trim() !== '')
  return parts.length ? `${state.title}: [${parts.join(' | ')}]` : state.title
})

/**
 * 验证表单允许提交状态
 * @description 仅比对表单是否发生修改，校验推迟到保存时统一执行，避免未触碰即报错
 */
const checkAllow = () => {
  state.haveModification = !compareObjects(editForm.value, sourceForm.value)
}

/**
 * 获取文章详情数据
 * @param {number} id - 文章ID
 * @returns {Promise<object>} 文章详情数据
 */
const fetchData = async (id: any) => {
  if (state.loading) return
  state.loading = true
  const { data } = await standardsDetail({ id: id || 0 })
  state.loading = false
  return data
}

/**
 * 显示编辑对话框核心逻辑
 * @param {object|null} row - 行数据对象（null时为新建模式）
 * @description 处理新建/编辑模式初始化逻辑；草稿改为打开后自动恢复+轻提示，不再弹窗打断
 */
const showEdit = async (row: any) => {
  const loadingInstance = ElLoading.service({ fullscreen: true });
  const initializeForm = (baseData: any, extendData?: any) => {
    sourceForm.value = JSON.parse(JSON.stringify({ ...baseData, ...(extendData || {}) }))
    editForm.value = JSON.parse(JSON.stringify(sourceForm.value))
    state.hasDraft = false
    open();
    loadingInstance.close();
  }

  if (!row) {
    state.isCreate = true
    state.title = translate('添加正式标准')
    const lastFormData = getStorage('lastFormData') || {}

    // 存在草稿：自动恢复但不打断，展示轻提示条，用户可主动放弃
    if (lastFormData[templateName]) {
      loadingInstance.close()
      // 草稿即“已有修改”：空白基准 + 草稿内容，保证恢复后可直接保存
      sourceForm.value = JSON.parse(JSON.stringify(state.fromData))
      editForm.value = JSON.parse(JSON.stringify({ ...state.fromData, ...lastFormData[templateName] }))
      state.haveModification = true
      state.hasDraft = true
      open()
      $baseMessage(translate('已恢复上次未提交的草稿，可继续编辑或放弃'), 'info', 'hey')
    } else {
      initializeForm(state.fromData)
    }
  } else {
    state.isCreate = false
    const detailRow = await fetchData(row.id)
    state.title = translate('编辑正式标准')
    initializeForm(state.fromData, { ...row, ...detailRow })
  }
}

/**
 * 放弃当前草稿并清空表单
 */
const discardDraft = () => {
  cleanLastFormData()
  sourceForm.value = JSON.parse(JSON.stringify(state.fromData))
  editForm.value = JSON.parse(JSON.stringify(state.fromData))
  state.hasDraft = false
  formRef.value?.clearValidate()
  $baseMessage(translate('已放弃草稿'), 'success', 'hey')
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
 * @description 处理表单提交和结果反馈；失败时恢复可编辑状态并提示
 */
const save = async () => {
  if (state.submit) return
  if (!state.haveModification) return
  state.submit = true

  try {
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return

    sanitizeLangContent()
    const { msg }: any = await standardsSave(editForm.value)
    formRef.value.resetFields()
    sourceForm.value = JSON.parse(JSON.stringify(state.fromData))
    editForm.value = JSON.parse(JSON.stringify(state.fromData))
    cleanLastFormData()
    $baseMessage(msg || translate('保存成功'), 'success', 'hey')
    emit('fetch-data')
    close()
  } catch (error: any) {
    $baseMessage(error?.message || translate('保存失败，请稍后重试'), 'error', 'hey')
  } finally {
    state.submit = false
  }
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
</script>

<style lang="scss" scoped>
.drawer-draft-alert {
  margin-bottom: 12px;

  :deep(.el-alert__title) {
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1.6;
  }
}

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
