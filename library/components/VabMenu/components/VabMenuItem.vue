<template>
  <el-menu-item :index="itemOrMenu.path" @click="handleLink">
    <vab-icon
      v-if="itemOrMenu.meta && itemOrMenu.meta.icon"
      :icon="itemOrMenu.meta.icon"
      :is-custom-svg="itemOrMenu.meta.isCustomSvg"
      :title="translate(itemOrMenu.meta.title)"
    />
    <span :title="translate(itemOrMenu.meta.title)">
      {{ translate(itemOrMenu.meta.title) }}
    </span>
    <el-tag v-if="itemOrMenu.meta && itemOrMenu.meta.badge" effect="dark" type="danger">
      {{ itemOrMenu.meta.badge }}
    </el-tag>
    <span v-if="itemOrMenu.meta && itemOrMenu.meta.dot" class="vab-dot vab-dot-error">
      <span />
    </span>
  </el-menu-item>
</template>

<script lang="ts" setup>
import { isHashRouterMode } from '/@/config'
import { translate } from '/@/i18n'
import { useSettingsStore } from '/@/store/modules/settings'
import { isExternal } from '/@/utils/validate'

defineOptions({
  name: 'VabMenuItem',
})

const props = defineProps({
  itemOrMenu: {
    type: Object,
    default() {
      return null
    },
  },
})

const route = useRoute()
const router = useRouter()
const $pub = inject<any>('$pub')
const settingsStore = useSettingsStore()
const { device } = storeToRefs(settingsStore)
const { foldSideBar } = settingsStore

const handleLink = () => {
  const routePath = props.itemOrMenu.path
  const target = props.itemOrMenu.meta.target
  if (target === '_blank') {
    if (isExternal(routePath)) {
      window.open(routePath)
      router.push('/redirect')
    } else if (route.path !== routePath) isHashRouterMode ? window.open(`#${routePath}`) : window.open(routePath)
    router.push('/redirect')
  } else {
    if (isExternal(routePath)) window.location.href = routePath
    else if (route.path !== routePath) {
      if (device.value === 'mobile') foldSideBar()
      router.push(props.itemOrMenu.path)
    } else $pub('reload-router-view')
  }
}
</script>

<style lang="scss" scoped>
:deep(.el-tag) {
  position: absolute;
  right: 20px;
  height: 16px;
  padding-right: 4px;
  padding-left: 4px;
  line-height: 16px;
}

.vab-dot {
  position: absolute !important;
  right: 20px;
}
</style>
