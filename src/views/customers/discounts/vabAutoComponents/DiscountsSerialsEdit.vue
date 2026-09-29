<!--
 * @Author: trexwb
 * @Date: 2025-03-27 08:57:23
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-04-30 12:34:26
 * @FilePath: /console/web/src/views/customers/discounts/vabAutoComponents/DiscountsSerialsEdit.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-drawer v-model="state.drawerdFormVisible" append-to-body :before-close="handleClose" direction="rtl" size="50%"
    :title="state.title">
    <el-form ref="formRef" label-width="80px" :model="editForm" :rules="state.fromRules">
      <el-form-item :label="translate('备注')" prop="remark">
        <el-input v-model="editForm.remark" :autosize="{ minRows: 3, maxRows: 5 }" type="textarea" :placeholder="translate('修改说明')" />
      </el-form-item>
      <el-form-item :label="translate('密钥')" prop="need_secret" style="width: 240px;">
        <el-select v-model="editForm.need_secret" clearable :placeholder="translate('请选择是否需要密钥')">
          <el-option :label="translate('不用')" :value="0" />
          <el-option :label="translate('需要')" :value="1" />
        </el-select>
      </el-form-item>
      <el-form-item :label="translate('类型')" prop="type" style="width: 240px;">
        <el-select v-model="editForm.type" clearable :placeholder="translate('请选择类型')">
          <el-option :label="translate('续期')" :value="0" />
          <el-option :label="translate('积分')" :value="1" />
          <el-option :label="translate('升级')" :value="2" />
          <el-option :label="translate('设备')" :value="3" />
          <el-option :label="translate('综合')" :value="4" />
        </el-select>
      </el-form-item>
      <el-form-item v-show="editForm.type === 0 || editForm.type === 4" :label="translate('续期天数')" prop="days">
        <el-input-number v-model.trim="editForm.days" :max="999" :min="0" clearable :placeholder="translate('续期天数')" />
      </el-form-item>
      <el-form-item v-show="editForm.type === 1 || editForm.type === 4" :label="translate('增加积分')" prop="credit">
        <el-input-number v-model.trim="editForm.credit" :max="999" :min="0" clearable :placeholder="translate('增加积分数')" />
      </el-form-item>
      <el-form-item v-show="editForm.type === 2 || editForm.type === 4" :label="translate('升级')" prop="level">
        <el-input-number v-model.trim="editForm.level" :max="999" :min="0" clearable :placeholder="translate('升级目标（目前无效，待升级）')" />
      </el-form-item>
      <el-form-item :label="translate('有效期')" prop="times_expire">
        <el-date-picker v-model="editForm.times_expire" type="datetime" :placeholder="translate('为空时永远有效')"
          format="YYYY/MM/DD HH:mm:ss" :default-time="state.defaultTime" />
      </el-form-item>
      <el-form-item :label="translate('销售价格')" prop="price">
        <el-input v-model.trim="editForm.price" style="width: 240px;" maxlength="10"
          :formatter="(value: string) => value.replace(/\D/g, '')" :parser="(value: string) => value.replace(/\D/g, '')"
          :placeholder="translate('以分为单位')" />{{ editForm.price / 100 }}{{ translate('元') }}
      </el-form-item>
      <el-form-item :label="translate('生产数量')" prop="quantity">
        <el-input-number v-model.trim="editForm.quantity" :max="1000" :min="0"
          :formatter="(value: string) => value.replace(/\D/g, '')" :parser="(value: string) => value.replace(/\D/g, '')"
          clearable :placeholder="translate('需要生产的数量')" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('取 消') }}</el-button>
      <el-button v-permissions="{ permission: ['customersSerials:write'] }" v-debounce="save"
        :disabled="!(state.allow && state.haveModification)" :icon="Check" :loading="state.submit" type="primary">
        {{ translate('确定') }}
      </el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Check, Close } from '@element-plus/icons-vue'
import { serialsSave } from '/@/api/customers'
import { hasAnyKeyWithValue, compareObjects } from '/@/utils/formVerification'
import { ElMessageBox, ElLoading } from 'element-plus'

/* 组件模板名称 */
const templateName = 'CustomersDiscountsSerialsEdit'

/* 定义组件选项 */
defineOptions({
  name: templateName, // 注册组件名称，用于调试和keep-alive缓存标识
})

/* 编辑器相关引用 */
const formRef = ref<any>(null)  // 表单组件引用

/* 事件和全局方法 */
const emit = defineEmits(['fetch-data']) // 定义组件事件
const $baseMessage = inject<any>('$baseMessage') // 注入全局消息提示方法

/* 核心响应式状态 */
const state = reactive<any>({
  title: '', // 对话框标题
  drawerdFormVisible: false, // 表单抽屉可见状态
  isCreate: true, // 是否为创建模式
  submit: false, // 表单提交状态
  allow: false, // 是否允许提交
  haveModification: false, // 存在未保存修改标志
  loading: false, // 数据加载状态
  defaultTime: new Date(2000, 1, 1, 23, 59, 59), // '12:00:00'
  fromRules: { // 表单验证规则
    quantity: [{ required: true, trigger: 'blur', message: translate('请选择生成数量1-1000') }],
    remark: [{ required: true, trigger: 'blur', message: translate('备注不能为空') }],
  },
  fromData: { // 表单初始数据结构
    remark: '',
    type: 0,
    need_secret: 0,
    level: 0,
    days: 0,
    credit: 0,
    price: '',
    times_expire: '',
    extension: {},
    quantity: 1,
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
 * 显示编辑对话框核心逻辑
 * @param {object|null} row - 行数据对象（null时为新建模式）
 * @description 处理新建/编辑模式初始化逻辑，包含草稿加载功能
 */
const showEdit = async (row: any) => {
  const loadingInstance = ElLoading.service({ fullscreen: true });
  const initializeForm = (baseData: any) => {
    sourceForm.value = JSON.parse(JSON.stringify(baseData));
    editForm.value = JSON.parse(JSON.stringify(sourceForm.value));
    open();
    loadingInstance.close();
  }
  state.isCreate = true;
  state.title = translate('添加');

  initializeForm(state.fromData)
}

// 暴露组件方法
defineExpose({ showEdit })

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
      if (Number(editForm.value.type) === 0) {
        editForm.value.level = false
        editForm.value.credit = false
      } else if (Number(editForm.value.type) === 1) {
        editForm.value.level = false
        editForm.value.days = false
      } else if (Number(editForm.value.type) === 2) {
        editForm.value.credit = false
        editForm.value.days = false
      }
      const { msg }: any = await serialsSave({ ...editForm.value })
      formRef.value.resetFields()
      sourceForm.value = JSON.parse(JSON.stringify(state.fromData))
      editForm.value = JSON.parse(JSON.stringify(state.fromData))
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
    checkAllow()
  },
  { deep: true, immediate: false } // 深度监听，非立即触发
)

const init = () => {
  editForm.value && typeof editForm.value.destroy === 'function' && editForm.value.destroy()
  sourceForm.value && typeof sourceForm.value.destroy === 'function' && sourceForm.value.destroy()
}

/* 生命周期钩子 */
onMounted(() => { })
onBeforeUnmount(() => { /* 组件卸载前清理逻辑 */ })
onBeforeMount(() => {
  init()
})
</script>

<style>
.is-penultimate>.el-tree-node__content {
  color: #626aef;
}

.is-penultimate>.el-tree-node__children>div {
  display: inline-block;
  margin-right: 4px;

  &:not(:first-child) .el-tree-node__content {
    padding-left: 0px !important;
  }

  .el-tree-node__content {
    padding-right: 16px;
  }
}
</style>
