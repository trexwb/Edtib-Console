<!--
 * @Author: trexwb
 * @Date: 2025-03-28 08:45:44
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-05-26 09:44:34
 * @FilePath: /console/web/src/views/customers/open/vabAutoComponents/CustomersUsersReviewEdit.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-drawer v-model="state.drawerdFormVisible" append-to-body :before-close="handleClose" direction="rtl" size="40%"
    :title="state.title">
    <el-form ref="formRef" label-width="80px" :model="editForm" :rules="state.fromRules">
      <el-form-item :label="translate('账号昵称')" prop="nickname">
        <el-input v-model.trim="editForm.nickname" clearable />
      </el-form-item>
      <el-form-item :label="translate('真实姓名')" prop="truename">
        <el-input v-model="editForm.truename" clearable />
      </el-form-item>
      <el-form-item :label="translate('登录邮箱')" prop="email">
        <el-input v-model.trim="editForm.email" clearable />
      </el-form-item>
      <el-form-item :label="translate('登录手机')" prop="mobile">
        <el-input v-model.trim="editForm.mobile" clearable />
      </el-form-item>
      <el-form-item :label="translate('头像')" prop="avatar" style="width: 100%">
        <customers-avatar :files="editForm.avatar" accept="image/*" @change-files="changeFiles"></customers-avatar>
      </el-form-item>
      <el-form-item :label="translate('经办人')" prop="manager" style="width: 100%">
        <el-input v-model.trim="editForm.manager.nickname" clearable />
      </el-form-item>
      <el-form-item :label="translate('有效期')" prop="times_expire">
        <el-date-picker v-model="editForm.times_expire" type="datetime" :placeholder="translate('为空时永远有效')"
          format="YYYY/MM/DD HH:mm:ss" :default-time="state.defaultTime" />
      </el-form-item>
      <el-form-item :label="translate('初始积分')" prop="credit">
        <el-input-number v-model.trim="editForm.credit" :max="999" :min="0" clearable :placeholder="translate('初始积分数')" />
      </el-form-item>
      <el-form-item :label="translate('登录密码')" prop="password">
        <el-input type="password" v-model.trim="editForm.password"
          :placeholder="state.isCreate ? translate('请输入登录密码') : translate('修改密码时需要填写')" show-password clearable />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('取 消') }}</el-button>
      <el-button v-if="editForm.status === 2" v-permissions="{ permission: ['customersUsersReview:write'] }"
        v-debounce="handleRefuse" :icon="WarnTriangleFilled" :loading="state.submit" type="danger">
        {{ translate('拒绝') }}
      </el-button>
      <el-button v-if="editForm.status === 2" v-permissions="{ permission: ['customersUsersReview:write'] }"
        v-debounce="handlePass" :icon="Check" :loading="state.submit" type="success">
        {{ translate('通过') }}
      </el-button>
      <el-button v-permissions="{ permission: ['customersUsersReview:write'] }" v-debounce="save"
        :disabled="!(state.allow && state.haveModification)" :icon="Check" :loading="state.submit" type="primary">
        {{ translate('保存') }}
      </el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Check, Close, WarnTriangleFilled } from '@element-plus/icons-vue'
import { usersReviewDetail, usersReviewSave } from '/@/api/customers'
import { usersList } from '/@/api/accounts'
import { getStorage, setStorage } from '/@/utils/storage'
import { hasAnyKeyWithValue, compareObjects } from '/@/utils/formVerification'
import { ElMessageBox, ElLoading } from 'element-plus'

/* 组件模板名称 */
const templateName = 'CustomersOpenUsersReviewEdit'

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
    nickname: [{ required: true, trigger: 'blur', message: translate('请填写昵称') }],
    truename: [{ required: true, trigger: 'blur', message: translate('请填写真实姓名') }],
    email: [{ required: true, trigger: 'blur', message: translate('请填写邮箱') }],
    mobile: [{ required: true, trigger: 'blur', message: translate('请填写手机号') }],
  },
  fromData: { // 表单初始数据结构
    id: null,
    nickname: '',
    truename: '',
    email: '',
    mobile: '',
    avatar: '',
    password: null,
    times_expire: null,
    credit: 0,
    manager: { nickname: '' },
    extension: {},
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
  const { data } = await usersReviewDetail({ id: id || 0 })
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
    const merged = JSON.parse(JSON.stringify({ ...baseData, ...(extendData || {}) }));
    // 经办人兼容：历史数据可能为 null/undefined/字符串，统一归一为对象形态，避免模板读取报错
    if (typeof merged.manager !== 'object' || merged.manager === null) {
      merged.manager = { nickname: typeof merged.manager === 'string' ? merged.manager : '' };
    }
    sourceForm.value = merged;
    editForm.value = JSON.parse(JSON.stringify(merged));
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

const handleRefuse = () => {
  ElMessageBox.prompt(translate('请填写拒绝原因，方便经办人调整！'), translate('拒绝原因'), {
    confirmButtonText: 'OK',
    cancelButtonText: 'Cancel',
    inputValidator: (value) => {
      if (!value || value.trim() === '') {
        return translate('拒绝原因不能为空'); // 返回错误信息
      }
      return true; // 校验通过
    }
  })
    .then(({ value }) => {
      editForm.value.remark = value
      editForm.value.status = 3
      save()
    })
    .catch(() => { })
}
const handlePass = () => {
  ElMessageBox.confirm(translate('您确定审核通过开户信息？审核通过后开户成功！'), translate('提示'), {
    draggable: true,
    type: 'warning',
  })
    .then(async () => {
      editForm.value.status = 1
      save()
    })
    .catch((err) => {
      console.log(err)
    })
}
/**
 * 保存表单核心逻辑
 * @description 处理表单提交和结果反馈
 */
const save = () => {
  if (state.submit) return
  state.submit = true

  formRef.value.validate(async (valid: any) => {
    if (valid) {
      const { msg }: any = await usersReviewSave({ ...editForm.value })
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
