<template>
  <el-tree-select
    v-if="theme.showSearch"
    v-model="value"
    class="vab-search"
    clearable
    :data="addFieldToTree(routes)"
    default-expand-all
    filterable
    highlight-current
    :prefix-icon="Search"
    @node-click="handleSelect"
  >
    <template #default="{ data }">
      <vab-icon v-if="data.meta && data.meta.icon" :icon="data.meta.icon" />
      <span style="margin-left: 3px">{{ translate(data.meta.title) }}</span>
    </template>
  </el-tree-select>
</template>

<script lang="ts" setup>
import { Search } from '@element-plus/icons-vue'
import { isHashRouterMode } from '/@/config'
import { translate } from '/@/i18n'
import { useRoutesStore } from '/@/store/modules/routes'
import { useSettingsStore } from '/@/store/modules/settings'
import { isExternal } from '/@/utils/validate'

defineOptions({
  name: 'VabSearch',
})

const settingsStore = useSettingsStore()
const { theme } = storeToRefs(settingsStore)
const value = ref<any>('')
const router = useRouter()
const route = useRoute()
const routesStore = useRoutesStore()
const { getRoutes: routes } = storeToRefs(routesStore)

const addFieldToTree = (data: any) => {
  data.forEach((node: any) => {
    node.value = node.name
    node.label = translate(node.meta.title)
    if (node.children && node.children.length) addFieldToTree(node.children)
  })
  return data
}

const handleSelect = (item: any) => {
  nextTick(() => {
    if (!item.children)
      if (isExternal(item.path)) {
        window.open(item.path)
        router.push('/redirect')
        return
      } else if (item.meta.target === '_blank') {
        isHashRouterMode ? window.open(`#${item.path}`) : window.open(item.path)
        router.push('/redirect')
        return
      } else router.push(item)
  })
}

watch(
  route,
  () => {
    value.value = route.name
  },
  {
    immediate: true,
  }
)
</script>

<style lang="scss" scoped>
.vab-search {
  :deep() {
    .el-input {
      width: 150px !important;
    }
  }
}
</style>
