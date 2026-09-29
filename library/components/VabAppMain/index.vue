<template>
  <div class="vab-app-main">
    <section>
      <vab-router-view />
      <vab-footer />
    </section>
  </div>
</template>

<script lang="ts" setup>
import { storeToRefs } from 'pinia';
import { useRoutesStore } from '/@/store/modules/routes';
import { handleActivePath } from '/@/utils/routes';

declare interface MyRoutesModuleType {
  tab: {
    data: string | undefined
  }
  tabMenu: string | undefined
  activeMenu: {
    data: string | undefined
  }
  routes: any[]
  allRoutes: any[]
}

defineOptions({
  name: 'VabAppMain',
})

const route = useRoute()
const routesStore = useRoutesStore()
const { tab, activeMenu } = storeToRefs(routesStore)

watch(
  route,
  () => {
    if (typeof route.matched[0].name === 'string' && tab.value.data !== route.matched[0].name) tab.value.data = route.matched[0].name
    activeMenu.value.data = handleActivePath(route)
  },
  { immediate: true }
)
</script>
