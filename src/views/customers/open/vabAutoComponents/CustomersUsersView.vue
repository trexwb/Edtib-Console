<!--
 * @Author: trexwb
 * @Date: 2025-03-28 08:46:45
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-04-30 12:16:16
 * @FilePath: /console/web/src/views/customers/open/vabAutoComponents/CustomersUsersView.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-drawer v-model="state.drawerdFormVisible" append-to-body :before-close="handleClose" direction="rtl" size="50%"
    :title="translate('详情')">
    <el-descriptions border :column="2" direction="horizontal">
      <el-descriptions-item>
        <template #label>{{ translate('昵称') }}</template>
        {{ viewForm.nickname }}
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('真实姓名') }}</template>
        {{ viewForm.truename }}
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('登录邮箱') }}</template>
        {{ viewForm.email }}
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('手机号') }}</template>
        {{ viewForm.mobile }}
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('真实姓名') }}</template>
        {{ viewForm.truename }}
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>UUID</template>
        {{ viewForm.uuid }}
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('头像') }}</template>
        <el-avatar :size="50" :src="`${viewForm.avatar}!a50`">
          <img src="/@/assets/avatar.svg" alt="Default Avatar" />
        </el-avatar>
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('当前积分') }}</template>
        {{ viewForm.credit }}
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('有效期') }}</template>
        {{ viewForm.times_expire }}
      </el-descriptions-item>
      <el-descriptions-item>
        <template #label>{{ translate('状态') }}</template>
        <el-tag v-if="viewForm.status === 0" type="info">{{ translate('草稿') }}</el-tag>
        <el-tag v-if="viewForm.status === 1" type="success">{{ translate('正常') }}</el-tag>
        <el-tag v-if="viewForm.status === 2" type="primary">{{ translate('待审') }}</el-tag>
        <el-tag v-if="viewForm.status === 3" type="danger">{{ translate('驳回') }}</el-tag>
      </el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('关闭') }}</el-button>
      <el-button v-if="viewForm.status === 0 || viewForm.status === 3"
        v-permissions="{ permission: ['customersUsers:write'] }" :icon="Edit" type="primary" @click="handleEdit">
        {{ translate('修改') }}
      </el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { useAclStore } from '/@/store/modules/acl'
import { Close, Edit, Delete } from '@element-plus/icons-vue'
import { usersDetail } from '/@/api/customers'
import { ElLoading } from 'element-plus'

/* 组件模板名称 */
const templateName = 'CustomersOpenUsersView'

/* 定义组件选项 */
defineOptions({
  name: templateName, // 注册组件名称，用于调试和keep-alive缓存标识
})

/* 权限和语言相关状态 */
const aclStore = useAclStore()
const { languages, defaultItem } = storeToRefs(aclStore) // 解构多语言列表响应式引用

/* 编辑器相关引用 */
// VMdEditor.use(githubTheme)
const viewForm = ref<any>({})

/* 事件和全局方法 */
const emit = defineEmits(['handle-edit', 'handle-delete']) // 定义组件事件

/* 核心响应式状态 */
const state = reactive<any>({
  drawerdFormVisible: false, // 表单抽屉可见状态
  activeName: defaultItem.value.languages || 'zh-cn', // 当前激活的标签页
  defaultLang: defaultItem.value.languages || 'zh-cn', // 默认语言编码
  loading: false
})

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
const showView = async (row: any) => {
  const loadingInstance = ElLoading.service({ fullscreen: true });
  viewForm.value = await fetchData(row.id);
  open();
  loadingInstance.close();
}

// 暴露组件方法
defineExpose({ showView })

// 对话框控制方法
const open = () => { state.drawerdFormVisible = true }
const close = async () => { state.drawerdFormVisible = false }

const handleClose = () => {
  close()
}

const handleEdit = () => {
  close()
  emit('handle-edit', viewForm.value)
}

const handleDelete = () => {
  close()
  emit('handle-delete', viewForm.value)
}

/* 生命周期钩子 */
onMounted(() => { /* 组件挂载后逻辑 */ })
onBeforeUnmount(() => { /* 组件卸载前清理逻辑 */ })
</script>

<style lang="scss" scoped></style>
