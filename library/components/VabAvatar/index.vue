<!--
 * @Author: trexwb
 * @Date: 2023-11-14 11:28:18
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-06-13 15:21:26
 * @FilePath: /console/web/library/components/VabAvatar/index.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2024 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-dropdown @command="handleCommand" @visible-change="handleVisibleChange">
    <span class="avatar-dropdown">
      <el-avatar class="user-avatar" :src="avatar">
        <img src="/@/assets/avatar.svg" alt="Default Avatar" />
      </el-avatar>
      <div class="username">
        <span class="hidden-xs-only">{{ username }}</span>
        <vab-icon class="vab-dropdown" :class="{ 'vab-dropdown-active': active }" icon="arrow-down-s-line" />
      </div>
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="account" v-if="hasPermission(['accountUsers'])">
          <vab-icon icon="account-box-line" />
          <span>账号管理</span>
        </el-dropdown-item>
        <el-dropdown-item command="cache" v-if="hasPermission(['cache'])">
          <vab-icon icon="close-circle-line" />
          <span>缓存管理</span>
        </el-dropdown-item>
        <el-dropdown-item command="update">
          <vab-icon icon="arrow-up-circle-line" />
          <span>检查更新</span>
        </el-dropdown-item>
        <el-dropdown-item command="logout">
          <vab-icon icon="logout-circle-r-line" />
          <span>{{ translate('退出登录') }}</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script lang="ts" setup>
import { watch } from 'vue';
import { useRoutesStore } from '/@/store/modules/routes'
import { useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus'
import { translate } from '/@/i18n'
import { useUserStore } from '/@/store/modules/user'
import { hasPermission } from '/@/utils/permission'
import { toLoginRoute } from '/@/utils/routes'
import { getWorksPath } from '/@/api/common'

const routesStore = useRoutesStore()
const { changeActiveMenu, changeMenuMeta } = routesStore

defineOptions({
  name: 'VabAvatar',
})

const state = reactive({
  loading: false
})

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { avatar, username } = storeToRefs(userStore)
const { logout } = userStore
const active = ref<boolean>(false)

const handleVisibleChange = (value: boolean) => {
  active.value = value
}
const handleCommand = async (command: any) => {
  switch (command) {
    case 'account':
      await router.push({ path: '/settings/account', replace: false })
      break;
    case 'cache':
      await router.push({ path: '/settings/cache', replace: false })
      break;
    case 'update':
      await router.push({ path: '/settings/update', replace: false })
      break;
    case 'logout':
      ElMessageBox.confirm('您确定要放弃登录退出系统吗？', {
        draggable: false,
        type: 'warning',
      }).then(async () => {
        await logout()
        await router.push(toLoginRoute(route.fullPath))
      }).catch(() => {
        // catch error
      })
      break;
  }
}

// 辅助函数：获取目标路由的父级路由名称
function getParentRouteName(targetRoute: any) {
  const routes = router.getRoutes();
  for (const route of routes) {
    if (route.children && route.children.some(child => child.name === targetRoute.name)) {
      return route.name; // 返回父级路由名称
    }
  }
  return null; // 如果没有找到父级路由，返回 null
}
// 动态修改路由
const updateRouteBadge = function (routeName: string, badge: number) {
  // const routes = router.getRoutes();
  // const targetRoute = routes.find(route => route.name === routeName);
  // if (targetRoute) {
  //   if (badge > 0) {
  //     targetRoute.meta.badge = `${badge}${badge > 99 ? '+' : ''}`;
  //   } else {
  //     delete targetRoute.meta.badge;
  //   }
  //   // 删除旧路由
  //   if (router.hasRoute(routeName)) {
  //     router.removeRoute(routeName);
  //   }
  //   // 重新添加路由到正确的父级
  //   const parentRouteName = getParentRouteName(targetRoute);
  //   if (parentRouteName) {
  //     router.addRoute(parentRouteName, targetRoute);
  //   }
  // }
  const meta = {} as any;
  if (badge > 0) meta.badge = `${badge > 99 ? 99 : badge}${badge > 99 ? '+' : ''}`;
  changeMenuMeta({
    name: routeName,
    meta: meta,
  })
}

let refreshTimer: number | null = null;
const getWorks = async () => {
  if (state.loading) {
    // setTimeout(() => { getWorks() }, 30000);
    return;
  }
  try {
    state.loading = true;
    const { data } = await getWorksPath();
    updateRouteBadge('StandardsProductsReview', data['productsReviewTotal'] || 0);
    updateRouteBadge('CustomersOpenUsersReview', data['customersUsers'] || 0);
    updateRouteBadge('CustomersOpenOrganizationsReview', data['customersOrganizations'] || 0);
  } catch (error) {
    console.error('Failed to fetch works:', error);
  } finally {
    state.loading = false;
    // 30秒后再次刷新
    // refreshTimer = window.setTimeout(getWorks, 30000);
  }
}
const clearRefresh = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

watch(
  () => route.name,
  async (newRouteName, oldRouteName) => {
    if (newRouteName !== oldRouteName) {
      await getWorks();
    }
  }
);

const init = () => {
  getWorks();
}

/* 生命周期钩子 */
onMounted(() => { })
onBeforeUnmount(() => {
  if (refreshTimer) {
    clearRefresh();
  }
})
onBeforeMount(() => {
  init()
})
</script>

<style lang="scss" scoped>
.avatar-dropdown {
  display: flex;
  align-content: center;
  align-items: center;
  justify-content: center;
  justify-items: center;

  .user-avatar {
    box-sizing: border-box;
    width: 40px;
    height: 40px;
    margin-left: 15px;
    cursor: pointer;
    border-radius: 50%;
  }

  .username {
    position: relative;
    display: flex;
    align-content: center;
    align-items: center;
    width: max-content;
    height: 40px;
    margin-left: 6px;
    line-height: 40px;
    cursor: pointer;

    [class*='ri-'] {
      margin-left: 0 !important;
    }
  }
}
</style>
