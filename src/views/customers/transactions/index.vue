<!--
 * @Author: trexwb
 * @Date: 2026-09-14
 * @FilePath: /client/console/web/src/views/customers/transactions/index.vue
 * @Description: 交易记录（个人 / 企业双 Tab，两侧查询条件与表格状态相互独立）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <div class="transactions-container">
    <el-tabs v-model="state.activeTab" @tab-change="handleTabChange">
      <el-tab-pane v-if="showTab('users')" :label="translate('个人交易')" lazy name="users">
        <transactions-panel scope="users" />
      </el-tab-pane>
      <el-tab-pane v-if="showTab('organizations')" :label="translate('企业交易')" lazy name="organizations">
        <transactions-panel scope="organizations" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { hasPermission } from '/@/utils/permission'
import TransactionsPanel from './components/TransactionsPanel.vue'

defineOptions({
  name: 'CustomersTransactions',
})

const state = reactive({
  activeTab: 'users',
})

// 仅渲染当前账号有权访问的 Tab（权限 key 与路由 guard、gateway AuthorizeFn 一致）
const showTab = (tab: string) => {
  return tab === 'users'
    ? hasPermission({ permission: ['customersUsersTransactions:read'] })
    : hasPermission({ permission: ['customersOrganizationsTransactions:read'] })
}

const handleTabChange = () => {}

/* 生命周期钩子 */
onBeforeMount(() => {
  // 仅有一个 Tab 有权限时，自动落到有权限的 Tab
  if (!showTab('users') && showTab('organizations')) state.activeTab = 'organizations'
})
</script>

<style lang="scss" scoped>
.transactions-container {
  padding: 0 10px;
}
</style>
