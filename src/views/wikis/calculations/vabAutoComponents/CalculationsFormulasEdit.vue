<!--
 * @Author: trexwb
 * @Date: 2025-03-28 14:28:45
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-05-12 10:23:10
 * @FilePath: /console/web/src/views/wikis/calculations/vabAutoComponents/CalculationsFormulasEdit.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div>
    <el-drawer v-model="state.drawerdFormVisible" append-to-body :before-close="handleClose" direction="rtl" size="60%"
      :title="drawerTitleText">
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
      <!-- 基本信息 -->
      <el-divider content-position="left">{{ translate('基本信息') }}</el-divider>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item :label="translate('类型')" prop="type">
            <el-select v-model="editForm.type" clearable :placeholder="translate('请选择类型')" style="width: 300px;"
            :disabled="!!state.presetShape">
              <el-option v-for="(item, key) in (configuration.standard || [])" :key="`shape[${key}]`"
                :label="item[state.defaultLang]" :value="Number(key)" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="translate('标识')" prop="code">
            <el-input v-model.trim="editForm.code" clearable :placeholder="translate('值的别称')" style="width: 300px;" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="translate('排序')" prop="sort">
            <el-input-number v-model.trim="editForm.sort" :max="999" :min="0" clearable
              :placeholder="translate('从小到大自然排序（0在最后）')" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="translate('启用')" prop="status">
            <el-switch v-model="editForm.status" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-col>
        <el-col :span="24" v-show="editForm.type == '1'">
          <el-form-item :label="translate('形状')">
            <template v-if="state.presetShape">
              <el-text type="primary">{{ state.presetShape.name || `${translate('形状')}#${state.presetShape.id}` }}</el-text>
              <el-text class="mx-1" type="info">{{ translate('公式将关联到该形状') }}{{ state.presetShape.variant === 'min' ? translate('（体积最小）') : state.presetShape.variant === 'max' ? translate('（体积最大）') : '' }}</el-text>
            </template>
            <template v-else>
              <el-form-item :label="translate('位置')">
                <el-select v-model="state.location" filterable clearable :placeholder="translate('请选择位置')"
                  @change="editForm.shape_id = ''">
                  <el-option v-for="(item, key) in (configuration.shape || [])" :key="`location[${key}]`"
                    :label="item[state.defaultLang]" :value="key" />
                </el-select>
              </el-form-item>
              <el-form-item :label="translate('形状')">
                <el-select v-model="editForm.shape_id" filterable clearable :placeholder="translate('请选择形状')">
                  <el-option v-for="(item, key) in state.shapes[state.location]" :key="`shape[${key}]`"
                    :label="item.names[state.defaultLang]" :value="item.id" />
                </el-select>
              </el-form-item>
            </template>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item :label="translate('公式')" prop="columnar">
            <el-text v-show="sourceForm.columnar && editForm.columnar != sourceForm.columnar" class="mx-1"
              type="warning">{{ translate('原公式：') }}{{ sourceForm.columnar }}</el-text>
            <el-input v-model.trim="editForm.columnar" clearable :placeholder="translate('计算公式')" style="width: 100%;"
              :rows="5" type="textarea" />
          </el-form-item>
        </el-col>
      </el-row>
      <div class="drawer-edit-vars">
        <el-select v-model="state.quick" filterable style="width: 100%" @change="changeQuick">
            <el-option-group v-for="(standard, key) in configuration.standard"
              :key="`group[${state.variables[key]}]`" :label="standard[state.defaultLang]">
              <el-option v-for="(item, index) in state.variables[key]" :key="`group${key}[${index}]`"
                :label="`${item.variable}=${item.code}`" :value="item.variable" />
            </el-option-group>
          </el-select>
          <el-collapse v-model="state.activeCollapse"
            style="width: 100%;" accordion>
            <el-collapse-item v-for="(standard, key) in configuration.standard"
              :title="standard[state.defaultLang]" :key="`collapse[${state.variables[key]}]`"
              :name="`collapse[${state.variables[key]}]`" v-show="state.variables[key]">
              <el-tooltip v-for="(item, index) in state.variables[key]" :key="`variables${key}[${index}]`"
                :content="`${item.variable}=${item.code}`" placement="bottom" effect="light">
                <el-tag type="primary" class="tag-container" @click="handleInsertTag(item.variable)">
                  {{ item.variable }}
                </el-tag>
              </el-tooltip>
            </el-collapse-item>
            <el-collapse-item :title="translate('数学方法')" name="collapse[math]">
              <el-tag type="info" class="tag-container" @click="handleInsertTag('0')">0</el-tag>
              <el-tag type="info" v-for="i in 9" class="tag-container" @click="handleInsertTag(i)">{{ i
                }}</el-tag>
              <el-tag type="info" class="tag-container" @click="handleInsertTag('.')">.</el-tag>
              <el-tag type="info" class="tag-container" @click="handleInsertTag('(')">(</el-tag>
              <el-tag type="info" class="tag-container" @click="handleInsertTag(')')">)</el-tag>
              <el-tag type="info" class="tag-container" @click="handleInsertTag('[')">[</el-tag>
              <el-tag type="info" class="tag-container" @click="handleInsertTag(']')">]</el-tag>
              <el-tag type="info" class="tag-container" @click="handleInsertTag('+')">+</el-tag>
              <el-tag type="info" class="tag-container" @click="handleInsertTag('-')">-</el-tag>
              <el-tag type="info" class="tag-container" @click="handleInsertTag('*')">×</el-tag>
              <el-tag type="info" class="tag-container" @click="handleInsertTag('/')">÷</el-tag>
              <el-popconfirm icon=""
                @confirm="handleMixedTag(`${state.popconfirm.first}^${state.popconfirm.second}`)"
                placement="top">
                <template #reference>
                  <el-tag type="info" class="tag-container" @click="state.popconfirm.second = 2">{{ translate('x方') }}</el-tag>
                </template>
                <template #actions="{ confirm, cancel }">
                  <el-input v-model="state.popconfirm.first" style="width: 50px" :placeholder="translate('底数')" />
                  ^
                  <el-input v-model="state.popconfirm.second" style="width: 50px" :placeholder="translate('乘方')" />
                  <el-button type="danger" size="small" @click="confirm">
                    ok
                  </el-button>
                </template>
              </el-popconfirm>
              <el-tag type="info" class="tag-container" @click="handleInsertTag('π')">π</el-tag>
              <el-popconfirm icon="" @confirm="handleMixedTag(`sqrt(${state.popconfirm.first})`)"
                placement="top">
                <template #reference>
                  <el-tag type="info" class="tag-container">{{ translate('平方根') }}</el-tag>
                </template>
                <template #actions="{ confirm, cancel }">
                  <el-input v-model="state.popconfirm.first" style="width: 50px" :placeholder="translate('底数')" />
                  <el-button type="danger" size="small" @click="confirm">
                    ok
                  </el-button>
                </template>
              </el-popconfirm>
              <el-popconfirm icon=""
                @confirm="handleMixedTag(`nthRoot(${state.popconfirm.first},${state.popconfirm.second})`)"
                placement="top">
                <template #reference>
                  <el-tag type="info" class="tag-container" @click="state.popconfirm.second = 2">{{ translate('次方根') }}</el-tag>
                </template>
                <template #actions="{ confirm, cancel }">
                  <el-input v-model="state.popconfirm.second" style="width: 50px" :placeholder="translate('次方')" />
                  √
                  <el-input v-model="state.popconfirm.first" style="width: 50px" :placeholder="translate('底数')" />
                  <el-button type="danger" size="small" @click="confirm">
                    ok
                  </el-button>
                </template>
              </el-popconfirm>
              <el-popconfirm icon="" @confirm="handleMixedTag(`sin(${state.popconfirm.first})`)"
                placement="top">
                <template #reference>
                  <el-tag type="info" class="tag-container">sin</el-tag>
                </template>
                <template #actions="{ confirm, cancel }">
                  <el-input v-model="state.popconfirm.first" style="width: 50px" :placeholder="translate('底数')" />
                  <el-button type="danger" size="small" @click="confirm">
                    ok
                  </el-button>
                </template>
              </el-popconfirm>
              <el-popconfirm icon="" @confirm="handleMixedTag(`cos(${state.popconfirm.first})`)"
                placement="top">
                <template #reference>
                  <el-tag type="info" class="tag-container">cos</el-tag>
                </template>
                <template #actions="{ confirm, cancel }">
                  <el-input v-model="state.popconfirm.first" style="width: 50px" :placeholder="translate('底数')" />
                  <el-button type="danger" size="small" @click="confirm">
                    ok
                  </el-button>
                </template>
              </el-popconfirm>
              <el-popconfirm icon="" @confirm="handleMixedTag(`tan(${state.popconfirm.first})`)"
                placement="top">
                <template #reference>
                  <el-tag type="info" class="tag-container">tan</el-tag>
                </template>
                <template #actions="{ confirm, cancel }">
                  <el-input v-model="state.popconfirm.first" style="width: 50px" :placeholder="translate('底数')" />
                  <el-button type="danger" size="small" @click="confirm">
                    ok
                  </el-button>
                </template>
              </el-popconfirm>
              <el-popconfirm icon="" @confirm="handleMixedTag(`asin(${state.popconfirm.first})`)"
                placement="top">
                <template #reference>
                  <el-tag type="info" class="tag-container">asin</el-tag>
                </template>
                <template #actions="{ confirm, cancel }">
                  <el-input v-model="state.popconfirm.first" style="width: 50px" :placeholder="translate('底数')" />
                  <el-button type="danger" size="small" @click="confirm">
                    ok
                  </el-button>
                </template>
              </el-popconfirm>
              <el-popconfirm icon="" @confirm="handleMixedTag(`acos(${state.popconfirm.first})`)"
                placement="top">
                <template #reference>
                  <el-tag type="info" class="tag-container">acos</el-tag>
                </template>
                <template #actions="{ confirm, cancel }">
                  <el-input v-model="state.popconfirm.first" style="width: 50px" :placeholder="translate('底数')" />
                  <el-button type="danger" size="small" @click="confirm">
                    ok
                  </el-button>
                </template>
              </el-popconfirm>
              <el-popconfirm icon="" @confirm="handleMixedTag(`atan(${state.popconfirm.first})`)"
                placement="top">
                <template #reference>
                  <el-tag type="info" class="tag-container">atan</el-tag>
                </template>
                <template #actions="{ confirm, cancel }">
                  <el-input v-model="state.popconfirm.first" style="width: 50px" :placeholder="translate('底数')" />
                  <el-button type="danger" size="small" @click="confirm">
                    ok
                  </el-button>
                </template>
              </el-popconfirm>
            </el-collapse-item>
          </el-collapse>
          <!-- <div style="width: 100%;">
            <div class="tag-dev">
              <el-divider content-position="left">{{ translate('操作') }}</el-divider>
              <el-tag type="danger" class="tag-container" @click="handleBackspace">{{ translate('退格') }}</el-tag>
              <el-tag type="danger" class="tag-container" @click="handleClean">{{ translate('清空') }}</el-tag>
            </div>
          </div> -->
      </div>

      <el-form-item :label="translate('公式名称')" prop="names">
        <el-input v-model.trim="(editForm.names || {})[stateCurLang]" clearable />
        <div v-if="stateCurLang !== state.defaultLang && !((editForm.names || {})[state.defaultLang])"
          class="drawer-edit-hint">{{ translate('默认语言') }}「{{ stateDefaultLangName }}」{{ translate('名称必填，未填写时请先切换维护默认语言') }}</div>
      </el-form-item>
      <div class="drawer-edit-editor">
        <div class="drawer-edit-editor-label">{{ translate('公式描述') }}</div>
        <docs-md-edit
          :ref="(el: any) => { if (el) editorRef[stateCurLang] = el; else delete editorRef[stateCurLang] }"
          :key="stateCurLang" :detail="(editForm.remarks || {})[stateCurLang]" :language="stateCurLang"
          @update-from="watchEditor" />
      </div>
    </el-form>
    <template #footer>
        <el-button :icon="Close" @click="handleClose">{{ translate('取 消') }}</el-button>
        <el-button v-permissions="{ permission: ['standardsFormulas:write'] }" v-debounce="save"
          :disabled="!(state.allow && state.haveModification)" :icon="Check" :loading="state.submit" type="primary">
          {{ translate('确定') }}
        </el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { useAclStore } from '/@/store/modules/acl'
import { Check, Close, Cellphone } from '@element-plus/icons-vue'
import { formulasDetail, formulasSave } from '/@/api/formulas'
import { shapesAll } from '/@/api/shapes'
import { variablesAll } from '/@/api/variables'
import { getStorage, setStorage } from '/@/utils/storage'
import { hasAnyKeyWithValue, compareObjects } from '/@/utils/formVerification'
import { ElMessageBox, ElLoading } from 'element-plus'

/* 组件模板名称 */
const templateName = 'WikisCalculationsFormulasEdit'

/* 定义组件选项 */
defineOptions({
  name: templateName, // 注册组件名称，用于调试和keep-alive缓存标识
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
 * @description 空内容且非默认语言时删除 names/remarks 键位，避免提交空 key 脏数据；
 * 默认语言空内容由必填校验兜底，保留键位让表单可恢复
 */
const sanitizeLangContent = () => {
  const nameLangs: string[] = Object.keys(editForm.value.names || {})
  nameLangs.forEach((lang: string) => {
    if (lang === state.defaultLang) return
    const name = (editForm.value.names || {})[lang]
    if (name === undefined || name === null || !String(name).trim()) delete editForm.value.names[lang]
  })
  const remarkLangs: string[] = Object.keys(editForm.value.remarks || {})
  remarkLangs.forEach((lang: string) => {
    if (lang === state.defaultLang) return
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
    const remarks = (editForm.value.remarks = (editForm.value.remarks || {}))
    if (value && String(value).trim()) remarks[lang] = value
    else if (lang !== state.defaultLang) delete remarks[lang]
  }
}

/** 抽屉标题：带当前对象名称上下文 */
const drawerTitleText = computed(() => {
  const f = editForm.value || {}
  const name = textOfNames(f.names)
  const parts = [name, f.code].filter((v) => v && String(v).trim() !== '')
  return parts.length ? `${state.title}: [${parts.join(' | ')}]` : state.title
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
  dialogVisible: false,
  presetShape: null as any, // 形状页带入的锁定形状（体积公式维护，公式将强制关联该形状）
  defaultLang: defaultItem.value.languages || 'zh-cn', // 默认语言编码
  activeCollapse: 'collapse[math]',
  quick: '',
  isCreate: true, // 是否为创建模式
  submit: false, // 表单提交状态
  allow: false, // 是否允许提交
  haveModification: false, // 存在未保存修改标志
  loading: false, // 数据加载状态
  shapes: {} as any,
  location: '',
  variables: [],
  columnar: [],
  popconfirm: {
    'first': '',
    'second': '',
    'third': '',
    'fourth': ''
  },
  fromRules: { // 表单验证规则
    names: [{ required: true, trigger: 'blur', message: translate('请填写公式名称') }],
    code: [{ required: true, trigger: 'blur', message: translate('请填写公式标识') }],
    columnar: [{ required: true, trigger: 'blur', message: translate('请填写计算公式') }],
  },
  fromData: { // 表单初始数据结构
    id: null,
    type: 1,
    shape_id: '',
    names: {},
    code: '',
    columnar: '',
    remarks: { "zh-cn": "" },
    extension: {},
    sort: 0,
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
  const { data } = await formulasDetail({ id: id || 0 })
  state.loading = false
  return data
}

const fetchShapes = async () => {
  const { data } = await shapesAll()
  // HTTP 返回按位置分组的对象，IPC 返回行数组，统一归一为 { [location]: shapes[] }
  if (Array.isArray(data)) {
    const grouped: Record<string, any[]> = {}
    ;(data || []).forEach((item: any) => {
      const key = String(item.location ?? '')
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(item)
    })
    state.shapes = grouped
  } else {
    state.shapes = data || {}
  }
}

const fetchVariables = async () => {
  const { data } = await variablesAll()
  state.variables = {};
  // variablesAll 在 HTTP/IPC 下均返回行数组（旧代码只兼容 {list} 包裹导致下拉恒为空）
  const variablesList = Array.isArray(data) ? data : data?.list || [];
  variablesList.forEach((item: any) => {
    if (!state.variables[item.type]) state.variables[item.type] = []
    state.variables[item.type].push({ ...item })
  })
}

const changeQuick = (value: any) => {
  if (!!value) {
    // state.columnar.push(value)
    // editForm.value.columnar = state.columnar.join('')
    editForm.value.columnar = `${editForm.value.columnar}${value}`;
    state.quick = '';
  }
}
const handleMixedTag = (tag: any) => {
  // console.log('handleInsertTag:', tag)
  // state.columnar.push(tag)
  // editForm.value.columnar = state.columnar.join('')
  editForm.value.columnar = `${editForm.value.columnar}${tag}`;
}
// 插入标签内容
const handleInsertTag = async (tag: any) => {
  // state.columnar.push(tag)
  // editForm.value.columnar = state.columnar.join('')
  editForm.value.columnar = `${editForm.value.columnar}${tag}`;
}
// 退格
const handleBackspace = () => {
  if (state.columnar.length) {
    state.columnar.pop()
    editForm.value.columnar = state.columnar.join('')
  }
}
const handleClean = () => {
  state.columnar = []
  editForm.value.columnar = ''
}

// 监听编辑器内容变化
const watchEditor = (row: any) => {
  if (row.language) {
    const remarks = (editForm.value.remarks = (editForm.value.remarks || {}))
    // 有内容写回；空内容且非默认语言时删除键位，避免把空 key 提交成脏数据
    if (row.detail && String(row.detail).trim()) remarks[row.language] = row.detail
    else if (row.language !== state.defaultLang) delete remarks[row.language]
  }
  checkAllow()
}

/**
 * 显示编辑对话框核心逻辑
 * @param {object|null} row - 行数据对象（null时为新建模式）
 * @description 处理新建/编辑模式初始化逻辑，包含草稿加载功能
 */
const showEdit = async (row: any, presetShape?: any) => {
  state.presetShape = presetShape || null
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
        applyPreset()
      }).catch(() => {
        cleanLastFormData()
        initializeForm(state.fromData)
        applyPreset()
      })
    } else {
      initializeForm(state.fromData)
      applyPreset()
    }
  } else {
    state.isCreate = false
    state.title = translate('编辑')
    const detailRow = await fetchData(row.id)
    state.location = (detailRow?.shape?.location || '').toString()
    initializeForm(state.fromData, { ...row, ...detailRow })
    if (state.presetShape) {
      state.location = String(state.presetShape.location ?? '')
      editForm.value.extension = { ...(editForm.value.extension || {}), variant: state.presetShape.variant }
    }
  }
}

/**
 * 应用形状页带入的锁定形状：类型固定为产品标准（type=1），公式强制关联该形状
 */
const applyPreset = () => {
  if (state.presetShape) {
    editForm.value.type = 1
    editForm.value.shape_id = state.presetShape.id
    state.location = String(state.presetShape.location ?? '')
    if (state.presetShape.variant) {
      editForm.value.extension = { ...(editForm.value.extension || {}), variant: state.presetShape.variant }
    }
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
      const payload = JSON.parse(JSON.stringify(editForm.value))
      if (payload.shape_id === '' || payload.shape_id === undefined) payload.shape_id = null
      const { msg }: any = await formulasSave(payload)
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
  fetchShapes()
  fetchVariables()
})
</script>

<style lang="scss" scoped>
.tag-dev {
  padding: 0 5px;
  margin: 0 5px;
}

.tag-container {
  margin-right: 10px;
  margin-bottom: 10px;
  cursor: pointer;
}
</style>
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

  .drawer-edit-vars {
    margin: 4px 0 12px;
    padding: 10px 12px;
    border: 1px dashed var(--el-border-color);
    border-radius: 8px;
    background: var(--el-fill-color-lighter);
  }

  :deep(.el-divider--horizontal) {
    margin: 18px 0 16px;

    &:first-of-type {
      margin-top: 4px;
    }
  }
}
</style>
