<!--
 * @Author: trexwb
 * @Date: 2025-03-27 11:11:03
 * @LastEditors: trexwb
 * @LastEditTime: 2025-10-15 18:02:33
 * @FilePath: /client/console/web/src/views/customers/discounts/vabAutoComponents/DiscountsSerialsStatus.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-dialog v-model="state.drawerdFormVisible" append-to-body :close-on-click-modal="false" draggable
    :title="state.title" width="500px" @close="handleClose">
    <el-form ref="formRef" label-width="80px" :model="editForm" :rules="state.fromRules">
      <el-form-item :label="translate('提醒')">
        <el-text class="mx-1" type="danger">{{ translate('批量修改') }}【{{ Number(editForm.id) ? 1 :
          editForm.id?.length }}】{{ translate('条序列号状态') }}</el-text>
      </el-form-item>
      <el-form-item :label="translate('状态')" prop="status">
        <el-select v-model="editForm.status" clearable :placeholder="translate('请选择状态')">
          <el-option :label="translate('待售不可用')" value="0" />
          <el-option :label="translate('已售正常可用')" value="1" />
          <el-option :label="translate('已用不可用')" value="2" />
          <el-option :label="translate('回收禁用')" value="3" />
        </el-select>
      </el-form-item>
      <el-form-item :label="translate('备注')" prop="remark">
        <el-input v-model="editForm.remark" :autosize="{ minRows: 3, maxRows: 5 }" type="textarea" :placeholder="translate('修改说明')" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('取 消') }}</el-button>
      <el-button v-permissions="{ permission: ['customersSerials:write'] }" v-debounce="save"
        :disabled="!(state.allow && state.haveModification)" :icon="Check" :loading="state.submit" type="primary">
        {{ translate('确定') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Check, Close } from '@element-plus/icons-vue'
import { serialsStatus } from '/@/api/customers'
import { hasAnyKeyWithValue, compareObjects } from '/@/utils/formVerification'
import { ElMessageBox } from 'element-plus'

/* 组件模板名称 */
const templateName = 'CustomersDiscountsSerialsStatus'

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
  roles: [],
  fromRules: { // 表单验证规则
    status: [{ required: true, trigger: 'blur', message: translate('请选择要修改的状态') }],
  },
  fromData: { // 表单初始数据结构
    id: null,
    remark: '',
    status: '0',
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
const showStatus = async (row: any) => {
  const initializeForm = (baseData: any, extendData?: any) => {
    sourceForm.value = JSON.parse(JSON.stringify({ ...baseData, ...(extendData || {}) }))
    editForm.value = JSON.parse(JSON.stringify(sourceForm.value))
    open()
  }
  initializeForm(state.fromData, { id: row })
}

// 暴露组件方法
defineExpose({ showStatus })

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
      const { msg }: any = await serialsStatus({ ...editForm.value })
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
