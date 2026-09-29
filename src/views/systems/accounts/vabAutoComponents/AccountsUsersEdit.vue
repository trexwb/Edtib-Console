<!--
 * @Author: trexwb
 * @Date: 2025-03-27 08:57:23
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-04-30 12:19:25
 * @FilePath: /console/web/src/views/systems/accounts/vabAutoComponents/AccountsUsersEdit.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-drawer v-model="state.drawerdFormVisible" append-to-body :before-close="handleClose" direction="rtl" size="50%"
    :title="state.title">
    <el-form ref="formRef" label-width="80px" :model="editForm" :rules="state.fromRules">
      <el-form-item :label="translate('角色')" prop="roles">
        <el-select v-model="editForm.roles" :placeholder="translate('选择角色')" size="large" multiple style="width: 240px">
          <el-option v-for="item in state.roles" :key="`roles${item.value}`" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
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
        <accounts-avatar :files="editForm.avatar" accept="image/*" @change-files="changeFiles"></accounts-avatar>
      </el-form-item>
      <el-form-item :label="translate('登录密码')" prop="password">
        <el-input type="password" v-model.trim="editForm.password"
          :placeholder="state.isCreate ? translate('请输入登录密码') : translate('修改密码时需要填写')" show-password clearable />
      </el-form-item>
      <el-form-item :label="translate('启用')" prop="status">
        <el-switch v-model="editForm.status" :active-value="1" :inactive-value="0" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('取 消') }}</el-button>
      <el-button v-permissions="{ permission: ['accountsUsers:write'] }" v-debounce="save"
        :disabled="!(state.allow && state.haveModification)" :icon="Check" :loading="state.submit" type="primary">
        {{ translate('确定') }}
      </el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Check, Close } from '@element-plus/icons-vue'
import { usersDetail, usersSave, rolesList } from '/@/api/accounts'
import { getStorage, setStorage } from '/@/utils/storage'
import { hasAnyKeyWithValue, compareObjects } from '/@/utils/formVerification'
import { ElMessageBox, ElLoading } from 'element-plus'

/* 组件模板名称 */
const templateName = 'SystemsAccountsUsersEdit'

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
    roles: [{ required: true, trigger: 'blur', message: translate('请选择角色') }],
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
    extension: {},
    roles: [],
    status: 1,
  },
})

/* 编辑表单数据模型 */
const editForm = ref<any>({ ...state.fromData })
const sourceForm = ref<any>({ ...state.fromData })

// 使用示例
const fetchRoles = async () => {
  try {
    const { data } = await rolesList({ page: 1, pageSize: 5000 });
    state.roles = (data?.list || []).map((item: any) => {
      return {
        label: item.name,
        value: item.id,
      }
    })
    console.log('state.roles:', state.roles)
  } catch (error) {
    console.error('菜单转换失败:', error)
  }
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
  const { data } = await usersDetail({ id: id || 0 })
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
  const transformObjectToArray = (arr: any) => {
    if (!Array.isArray(arr)) return [];
    return arr.filter((item: any) => item !== undefined).map((item: any) => item?.id || '');
  };

  await fetchRoles();

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
    detailRow.roles = transformObjectToArray(detailRow.role_data)
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

/**
 * 保存表单核心逻辑
 * @description 处理表单提交和结果反馈
 */
const save = () => {
  if (state.submit) return
  state.submit = true

  formRef.value.validate(async (valid: any) => {
    if (valid) {
      const { msg }: any = await usersSave({ ...editForm.value })
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
