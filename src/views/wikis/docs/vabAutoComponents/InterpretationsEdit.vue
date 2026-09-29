<!--
 * @Author: trexwb
 * @Date: 2025-03-25 11:42:29
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-04-30 12:24:26
 * @FilePath: /console/web/src/views/wikis/docs/vabAutoComponents/InterpretationsEdit.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-dialog v-model="dialogFormVisible" append-to-body :close-on-click-modal="false" draggable :title="title"
    width="800px" @close="close">
    <el-form ref="formRef" label-width="80px" :model="form" class="form-box">
      <!-- 维护语言切换：仅显示/维护当前语言内容，保存仍提交全部语言数据 -->
      <div v-if="stateLangOptions.length > 0" class="edit-langbar">
        <span class="edit-langbar__label">{{ translate('维护语言') }}</span>
        <el-select v-model="langModel" class="edit-langbar__select" size="default">
          <el-option v-for="lang in stateLangOptions" :key="lang.code" :label="lang.name" :value="lang.code" />
        </el-select>
        <span v-if="stateCurLang === state.defaultLang" class="edit-langbar__badge">{{ translate('默认语言') }}</span>
        <span v-else class="edit-langbar__tip">{{ translate('当前仅维护') }}「{{ stateCurLangName }}」{{ translate('，其余语言数据保持不变') }}</span>
      </div>
      <el-form-item :label="translate('标题')" prop="titles" style="width: 100%; padding-bottom: 10px">
        <el-input v-model.trim="form.titles[stateCurLang]" clearable :placeholder="translate('解读标题')" />
        <div v-if="stateCurLang !== state.defaultLang && !(form.titles[state.defaultLang])" class="edit-hint">{{ translate('默认语言') }}「{{ stateDefaultLangName }}」{{ translate('标题必填，未填写时请先切换维护默认语言') }}</div>
      </el-form-item>
      <!-- <el-form-item label="解读详情" prop="detail" style="width: 100%; padding-bottom: 10px">
        <content-edit
          :ref="(el) => (editorRef[item.abbreviation] = el)"
          :detail="editForm.data.detail[item.abbreviation]"
          :language="item.abbreviation"
          @update-from="watchEditor"
        />
      </el-form-item> -->
      <el-form-item :label="translate('相关标准')" prop="product_id" style="width: 100%; padding-bottom: 10px">
        <el-input v-model.trim="form.product_id" clearable :placeholder="translate('相关标准')" />
      </el-form-item>
      <el-divider content-position="left">{{ translate('设置') }}{{ translate('关键词') }}</el-divider>
      <el-row :gutter="20">
        <el-col :span="10">
          <el-form-item :label="translate('关键词')" style="width: 100%">
            <el-input v-model.trim="templateForm.title" clearable :placeholder="translate('关键词')" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="10">
          <el-form-item :label="translate('关联文件')" style="width: 100%">
            <el-input v-model.trim="templateForm.file" clearable :placeholder="translate('关联文件')" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-button :icon="Select" :disabled="!templateForm.title && !templateForm.file" type="primary"
            size="default" @click="confirmKeywords">
            {{ translate('生成') }}
          </el-button>
        </el-col>
      </el-row>
      <el-row :gutter="20" v-for="(keyItem, keyIndex) in (form.keywords || {})[stateCurLang] || []" :key="keyIndex">
        <el-col :span="10">
          <el-form-item :label="translate('关键词')" style="width: 100%">
            <el-input v-model.trim="keyItem.title" :placeholder="translate('关键词')" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="10">
          <el-form-item :label="translate('关联文件:')" style="width: 100%">
            <el-text style="width: 100%">{{ keyItem.file }}</el-text>
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-button :icon="Delete" type="text" size="small" @click="deleteKeywords(Number(keyIndex))">{{ translate('删除') }}</el-button>
        </el-col>
      </el-row>
      <el-divider content-position="left">{{ translate('通用设置') }}</el-divider>
      <el-form-item :label="translate('排序')" prop="sort" style="width: 100%; padding-bottom: 10px">
        <el-input v-model.trim="form.sort" clearable :placeholder="translate('从小到大自然排序（0在最后）')" />
      </el-form-item>
      <el-form-item :label="translate('状态')" prop="status">
        <el-switch v-model="form.status" :active-value="1" :inactive-value="0" :active-text="translate('启用')"
          :inactive-text="translate('禁用')" />
      </el-form-item>
    </el-form>
    <template #footer>
      <div style="text-align: center">
        <el-button type="primary" @click="save">{{ translate('提交') }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Plus, Search, Select, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElLoading } from 'element-plus'
import { interpretationsDetail, interpretationsSave } from '/@/api/interpretations'
import { useAclStore } from '/@/store/modules/acl'

const aclStore = useAclStore()
const { languages, defaultItem } = storeToRefs(aclStore)
defineOptions({
  name: 'InterpretationsEdit',
})

const emit = defineEmits(['fetch-data'])
const formRef = ref<any>(null)
const title = ref<string>('')
const dialogFormVisible = ref<boolean>(false)
let form = reactive<any>({
  id: '',
  code: '', // 编码
  titles: {}, // 标题
  product_id: '', // 关联产品编号
  detail: {}, // 解读详情（多语言）
  sort: '', // 排序
  extension: {},
  status: 1, // 状态：0禁用，1启用
  keywords: {}, // 关键词（每个词对应一个doc编号）
})

const templateForm = reactive<any>({
  title: '',
  file: '',
})
const label = reactive<any>({
  title: translate('关键词'),
  file: translate('关联文件'),
})
// 定义编辑表单
const editForm = reactive<any>({
  source: {},
  data: {},
})

// C-C5: 提交防重入状态
const state = reactive<any>({
  submit: false,
  defaultLang: defaultItem.value.languages || 'zh-cn', // 默认语言编码
})

const editorRef: Record<string, any> = {}

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
 * 清理多语言字段的脏键
 * @description 空内容且非默认语言时删除 titles/detail 键位，避免提交空 key 脏数据；
 * 默认语言空内容由必填校验兜底，保留键位让表单可恢复；keywords 保留空数组维持接口契约
 */
const sanitizeLangContent = () => {
  ;['titles', 'detail'].forEach((field: string) => {
    const fieldLangs: string[] = Object.keys((form as any)[field] || {})
    fieldLangs.forEach((langCode: string) => {
      if (langCode === state.defaultLang) return
      const value = (form as any)[field][langCode]
      if (value === undefined || value === null || !String(value).trim()) delete (form as any)[field][langCode]
    })
  })
}

/**
 * 维护语言下拉 v-model：切换前清理当前语言脏键，再切换维护语言
 */
const langModel = computed({
  get: () => stateCurLang.value,
  set: (v: string) => {
    if (!v || v === stateCurLang.value) return
    sanitizeLangContent()
    aclStore.setCurrentLang(v)
  },
})

const close = () => {
  formRef.value.resetFields()
  emit('fetch-data')
  dialogFormVisible.value = false
}

const showEdit = (row: any) => {
  const loadingInstance = ElLoading.service({ fullscreen: true });
  stateLangOptions.value.forEach((langItem: any) => {
    if (langItem && langItem.code) {
      form.titles[langItem.code] = ''
      form.detail[langItem.code] = ''
      form.keywords[langItem.code] = []
    }
  })
  if (!row) {
    title.value = translate('添加')
  } else {
    title.value = translate('编辑')
    form = reactive<any>({ ...row })
  }
  dialogFormVisible.value = true
  loadingInstance.close();
}

const confirmKeywords = () => {
  for (var key in templateForm) {
    if (!templateForm[key]) {
      ElMessage.error(`${label[key]}${translate('不能为空')}`)
      return
    }
  }
  if (!form.keywords[stateCurLang.value]) form.keywords[stateCurLang.value] = []
  form.keywords[stateCurLang.value].push({
    title: templateForm.title,
    file: templateForm.file,
  })
  templateForm.title = ''
  templateForm.file = ''
}
const deleteKeywords = (index: number) => {
  if (form.keywords[stateCurLang.value]) form.keywords[stateCurLang.value].splice(index, 1)
}

const save = () => {
  if (state.submit) return
  state.submit = true
  formRef.value.validate(async (valid: any) => {
    if (valid) {
      try {
        sanitizeLangContent()
        const { msg }: any = await interpretationsSave(form)
        formRef.value.resetFields()
        ElMessage.success(msg || translate('保存成功'))
        emit('fetch-data')
        dialogFormVisible.value = false
      } catch (error) {
        // 错误提示由 request 拦截器统一处理
        console.error('interpretations save error:', error)
      } finally {
        state.submit = false
      }
    } else {
      state.submit = false
    }
  })
}
// 监听编辑器内容变化
const watchEditor = (row: any) => {
  if (row.language) {
    editForm.data.detail[row.language] = row.detail
  }
}

defineExpose({
  showEdit,
})
</script>

<style lang="scss" scoped>
.edit-langbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding: 8px 12px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: var(--el-border-radius-base, 4px);
  background: var(--el-fill-color-light, #f5f7fa);

  .edit-langbar__label {
    flex: none;
    color: var(--el-text-color-regular);
    font-size: 13px;
  }

  .edit-langbar__select {
    flex: none;
    width: 180px;
  }

  .edit-langbar__badge {
    flex: none;
    padding: 1px 8px;
    color: var(--el-color-success);
    font-size: 12px;
    border: 1px solid var(--el-color-success-light-5, #b3e19d);
    border-radius: 999px;
  }

  .edit-langbar__tip {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}

.edit-hint {
  width: 100%;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 18px;
}

:deep(.el-divider--horizontal) {
  margin: 18px 0 16px;
}
</style>
