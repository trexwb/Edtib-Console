<!--
 * @Author: trexwb
 * @Date: 2025-03-26 15:19:47
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-06-10 09:42:03
 * @FilePath: /console/web/src/views/systems/accounts/vabAutoComponents/AccountsRolesEdit.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2025 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-drawer v-model="state.drawerdFormVisible" append-to-body :before-close="handleClose" direction="rtl" size="50%"
    :title="state.title">
    <el-form ref="formRef" label-width="80px" :model="editForm" :rules="state.fromRules">
      <el-form-item :label="translate('角色名')" prop="name">
        <el-input v-model.trim="editForm.name" clearable />
      </el-form-item>
      <el-form-item :label="translate('权限')" prop="permissions">
        <div class="custom-tree-node-container">
          <el-tree ref="treeRef" style="max-width: 600px" :data="state.roles" :default-checked-keys="editForm.roles"
            show-checkbox node-key="guard" default-expand-all :expand-on-click-node="false"
            :props="{ class: customNodeClass }" @check="getSelectedKeys" />
        </div>
      </el-form-item>
      <el-form-item :label="translate('启用')" prop="status">
        <el-switch v-model="editForm.status" :active-value="1" :inactive-value="0" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('取 消') }}</el-button>
      <el-button v-permissions="{ permission: ['accountsRoles:write'] }" v-debounce="save"
        :disabled="!(state.allow && state.haveModification)" :icon="Check" :loading="state.submit" type="primary">
        {{ translate('确定') }}
      </el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Check, Close, Refresh } from '@element-plus/icons-vue'
import { rolesDetail, rolesSave } from '/@/api/accounts'
import { getRoutesPath } from '/@/api/common'
import { getStorage, setStorage } from '/@/utils/storage'
import { hasAnyKeyWithValue, compareObjects } from '/@/utils/formVerification'
import type Node from 'element-plus/es/components/tree/src/model/node'
import type { TreeNodeData } from 'element-plus/es/components/tree/src/tree.type'
import { ElMessageBox, ElLoading } from 'element-plus'

/* 组件模板名称 */
const templateName = 'SystemsAccountsRolesEdit'

/* 定义组件选项 */
defineOptions({
  name: templateName, // 注册组件名称，用于调试和keep-alive缓存标识
})

/* 编辑器相关引用 */
const formRef = ref<any>(null)  // 表单组件引用
const treeRef = ref<any>(null)

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
    name: [{ required: true, trigger: 'blur', message: translate('请填写角色名称') }],
  },
  fromData: { // 表单初始数据结构
    id: null,
    name: '',
    permissions: [],
    operation: {},
    extension: {},
    roles: [],
    status: 1,
  },
})

/* 编辑表单数据模型 */
const editForm = ref<any>({ ...state.fromData })
const sourceForm = ref<any>({ ...state.fromData })

const customNodeClass = ({ isPenultimate }: TreeNodeData, node: Node) => isPenultimate ? 'is-penultimate' : ''
const transformMenu = (menuData: any[]) => {
  return menuData.filter(item => !item.meta?.levelHidden && !item.meta?.hidden).map((item: any) => {
    let roles: any = {}
    if (!item.meta?.levelHidden && !item.meta?.hidden) {
      roles.label = item.meta?.title
      if (item.children && item.children.length > 0) {
        roles.children = transformMenu(item.children)
      } else {
        roles.isPenultimate = true
        roles.guard = (item.meta?.guard || []).shift()
        roles.children = [{
          label: translate('只读'),
          guard: `${roles.guard}:read`
        }, {
          label: translate('编辑'),
          guard: `${roles.guard}:write`
        }, {
          label: translate('删除'),
          guard: `${roles.guard}:delete`
        }]
      }
    }
    return roles
  })
}

// 使用示例
const fetchRoutes = async () => {
  try {
    const { data } = await getRoutesPath();
    state.roles = transformMenu(data?.list || []);
  } catch (error) {
    console.error('菜单转换失败:', error)
  }
}

const getSelectedKeys = async () => {
  function transformArray(input: string[]): string[] {
    // 使用Set进行去重（Set自动处理重复项）
    const uniqueSet = new Set(input
      // 过滤无效值和特定后缀
      .filter(item => item !== undefined && typeof item === 'string')
      // 提取基础名称（去除:read/write/delete后缀）
      .map(item => item.split(':')[0])
    );

    // 转换为数组并排序（可选）
    return Array.from(uniqueSet).sort();
  }
  function transformArrayToObject(input: string[]): Record<string, string[]> {
    const map = new Map<string, string[]>();
    input.filter((item) => typeof item === 'string')
      .forEach((item) => {
        const [key, action] = item.split(':');
        if (!map.has(key)) {
          map.set(key, []); // 初始化为空数组
        }
        // 使用数组includes实现去重
        if (action && typeof action === 'string' && action.trim() !== '') {
          if (!map.get(key)!.includes(action)) {
            map.get(key)!.push(action);
          }
        }
      });
    return Object.fromEntries(map);
  }
  const selectedKeys = treeRef.value.getCheckedKeys();
  editForm.value.permissions = transformArray(selectedKeys);
  editForm.value.operation = transformArrayToObject(selectedKeys);
  // console.log('permissions:', JSON.stringify(editForm.value.permissions))
  // console.log('operation:', JSON.stringify(editForm.value.operation))
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
  const { data } = await rolesDetail({ id: id || 0 })
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
    sourceForm.value = JSON.parse(JSON.stringify({ ...baseData, ...(extendData || {}) }));
    // 仅保留 "key:action" 形态（permissions 模块标识无 action，无法作为 el-tree 勾选键）
    const rolesValue = sourceForm.value.roles;
    sourceForm.value.roles = Array.isArray(rolesValue)
      ? rolesValue.filter((role: any) => typeof role === 'string' && role.includes(':'))
      : [];
    editForm.value = JSON.parse(JSON.stringify(sourceForm.value));
    open();
    loadingInstance.close();
  }
  /**
   * 将后端返回的 operation 归一化为 "key:action" 字符串数组（el-tree 的 node-key=guard）
   * @param {any} obj - 权限数据，兼容 { key: [action] } / ['key:action'] / 空值 三种形态
   * @returns {string[]} - 扁平化的 "key:action" 数组
   *
   * @example
   * 输入：{ a: ['read','write'] } 输出：['a:read', 'a:write']
   * 输入：['a:read']              输出：['a:read']
   * 输入：null / undefined        输出：[]
   */
  const transformObjectToArray = (obj: any): string[] => {
    // 归一化为 "key:action" 字符串数组（el-tree 的 node-key=guard）
    // 兼容后端三类历史返回形态，任一形态缺失都不应抛错：
    //   1. { key: ['read','write'] }  —— key → actions 映射（getUserRoles 聚合结构）
    //   2. ['key:read', 'key:write']  —— 扁平字符串数组（旧 detail 结构）
    //   3. null / undefined / 非对象  —— 返回空数组
    if (!obj) return [];
    if (Array.isArray(obj)) {
      return obj.filter((item: any) => typeof item === 'string' && item.includes(':'));
    }
    if (typeof obj !== 'object') return [];
    return Object.keys(obj).flatMap((key) => {
      const actions = (obj as Record<string, unknown>)[key];
      if (Array.isArray(actions)) {
        return actions
          .filter((action: any) => typeof action === 'string' && action.trim() !== '')
          .map((action: string) => `${key}:${action}`);
      }
      if (typeof actions === 'string' && actions.trim() !== '') {
        return actions.split(/[,|\s]+/).filter(Boolean).map((action: string) => `${key}:${action}`);
      }
      if (actions && typeof actions === 'object') {
        // 形如 { read: true, write: 1 } 的开关对象
        return Object.keys(actions as Record<string, unknown>)
          .filter((action) => !!(actions as Record<string, unknown>)[action])
          .map((action) => `${key}:${action}`);
      }
      return [];
    });
  };

  await fetchRoutes();

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
    // 回显勾选态：operation 归一化为 "key:action"；permissions 为模块标识（无 action），仅作兜底合并
    const moduleKeys = Array.isArray(detailRow?.permissions)
      ? detailRow.permissions.filter((item: any) => typeof item === 'string')
      : []
    detailRow.roles = Array.from(new Set([...moduleKeys, ...transformObjectToArray(detailRow?.operation)]))
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
      await getSelectedKeys()
      const { msg }: any = await rolesSave(editForm.value)
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
