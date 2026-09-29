<template>
  <el-scrollbar wrap-class="scroll-wrap">
    <div class="vue-shop-vite-box" :class="{ mobile }">
      <component :is="layout" :collapse="collapse" :device="device" :fixed-header="theme.fixedHeader" :show-tabs="theme.showTabs" />
    </div>
    <vab-theme-drawer />
    <vab-theme-setting />
    <vab-statistics />
    <el-backtop target="#app .scroll-wrap" />
  </el-scrollbar>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '/@/store/modules/settings';
import { convertToCamelCase } from '/@/utils/convertToCamelCase';

defineOptions({
  name: 'Layout',
})

interface ComponentType {
  default: Component
}

const settingsStore = useSettingsStore()
const { device, collapse, theme } = storeToRefs(settingsStore)
const { toggleDevice, foldSideBar, openSideBar, updateTheme } = settingsStore
const mobile = ref(false)
let oldLayout = theme.value.layout
const imports = import.meta.glob<ComponentType>('./**/*.vue', { eager: true })
const Components: Record<string, Component> = {}
Object.getOwnPropertyNames(imports).forEach((key: any) => {
  Components[key.replace(/(\/|\.|index.vue)/g, '')] = imports[key].default
})

const layout = computed(() => {
  return Components[convertToCamelCase(`vab-layout-${theme.value.layout}`)]
})

const resizeBody = () => {
  mobile.value = document.body.getBoundingClientRect().width - 1 < 992
}

watch(mobile, (value) => {
  if (value) {
    oldLayout = theme.value.layout
    foldSideBar()
  } else openSideBar()
  theme.value.layout = value ? 'vertical' : oldLayout
  toggleDevice(value ? 'mobile' : 'desktop')
})

onBeforeMount(() => {
  resizeBody()
  window.addEventListener('resize', resizeBody)
  updateTheme()
})

onBeforeUnmount(() => {
  if (mobile) theme.value.layout = oldLayout
  window.removeEventListener('resize', resizeBody)
})
</script>

<style lang="scss" scoped>
.el-scrollbar__view.scroll-view {
  overflow: auto;
}

.vue-shop-vite-box {
  position: relative;
  width: 100%;
  height: 100%;

  [class*='vab-layout-'] {
    :deep() {
      .vab-layout-header {
        border-bottom: 1px solid var(--el-border-color);

        &.is-no-tabs {
          border-bottom: 0;
        }
      }
    }

    &.fixed {
      padding-top: calc(var(--el-nav-height) + var(--el-tabs-height));
    }

    &.fixed.no-tabs-bar {
      padding-top: var(--el-nav-height);
    }
  }

  :deep() {
    .fixed-header {
      position: fixed;
      top: 0;
      right: 0;
      z-index: calc(var(--el-z-index) - 1);
      width: 100%;
    }

    .vab-main {
      position: relative;
      width: auto;
      min-height: 100%;
      margin-left: var(--el-left-menu-width);

      &.is-collapse-main {
        margin-left: var(--el-left-menu-width-min);

        .fixed-header {
          width: var(--el-right-content-width-min);
        }
      }

      &:not(.is-collapse-main) {
        .fixed-header {
          width: calc(100% - var(--el-left-menu-width));
        }
      }
    }
  }

  /* 手机端开始 */
  &.mobile {
    :deep() {
      .vab-layout-vertical {
        .el-scrollbar.vab-side-bar {
          z-index: calc(var(--el-z-index) + 1);

          &.is-collapse {
            width: 0;
          }
        }

        .vab-main {
          .fixed-header {
            width: 100%;
          }
          & {
            margin-left: 0;
          }
        }
      }

      /* 隐藏分页和页码跳转 */
      .el-pager,
      .el-pagination__jump {
        display: none;
      }
    }
  }

  /* 手机端结束 */
}
</style>
