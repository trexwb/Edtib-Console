<!--
 * @Author: trexwb
 * @Date: 2024-10-29 15:50:57
 * @LastEditors: ${git_name}
 * @LastEditTime: 2025-04-18 13:48:10
 * @FilePath: /console/web/library/components/VabNav/index.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2024 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div class="vab-nav">
    <el-row :gutter="20">
      <el-col :lg="12" :md="12" :sm="12" :xl="12" :xs="4">
        <div class="left-panel">
          <vab-fold fold="contract-left-line" unfold="contract-right-line" />
          <el-tabs v-if="layout === 'comprehensive'" v-model="tab.data" tab-position="top" @tab-click="handleTabClick">
            <template v-for="(item, index) in routes" :key="index + item.name">
              <el-tab-pane :name="item.name">
                <template #label>
                  <vab-icon v-if="item.meta.icon" :icon="item.meta.icon" :is-custom-svg="item.meta.isCustomSvg" />
                  {{ translate(item.meta.title) }}
                </template>
              </el-tab-pane>
            </template>
          </el-tabs>
          <vab-breadcrumb v-else class="hidden-xs-only" />
        </div>
      </el-col>
      <el-col :lg="12" :md="12" :sm="12" :xl="12" :xs="20">
        <div class="right-panel">
          <vab-right-tools />
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts" setup>
import { openFirstMenu } from '/@/config'
import { translate } from '/@/i18n'
import { useRoutesStore } from '/@/store/modules/routes'
import { isExternal } from '/@/utils/validate'

defineOptions({
  name: 'VabNav',
})

defineProps({
  layout: {
    type: String,
    default: '',
  },
})

const router = useRouter()
const routesStore = useRoutesStore()
const { getTab: tab, getTabMenu: tabMenu, getRoutes: routes } = storeToRefs(routesStore)

const handleTabClick = () => {
  nextTick(() => {
    if (isExternal(tabMenu.value.path)) {
      window.open(tabMenu.value.path)
      router.push('/redirect')
    } else if (openFirstMenu) router.push(tabMenu.value.redirect || tabMenu.value)
  })
}
</script>

<style lang="scss" scoped>
.vab-nav {
  position: relative;
  height: var(--el-nav-height);
  padding-right: var(--el-padding);
  padding-left: var(--el-padding);
  overflow: hidden;
  user-select: none;
  background: var(--el-color-white);
  border-bottom: 1px solid var(--el-border-color);

  .left-panel {
    display: flex;
    align-items: center;
    justify-items: center;
    height: var(--el-nav-height);

    :deep() {
      .fold-unfold {
        margin-right: var(--el-margin);
      }

      .el-tabs {
        width: 100%;
        margin-left: var(--el-margin);

        .el-tabs__header {
          margin: 0;

          >.el-tabs__nav-wrap {
            display: flex;
            align-items: center;

            .el-icon-arrow-left,
            .el-icon-arrow-right {
              font-weight: 600;
              color: var(--el-color-grey);
            }
          }
        }

        .el-tabs__item {
          >div {
            display: flex;
            align-items: center;

            i {
              margin-right: 3px;
            }
          }
        }
      }

      .el-tabs__nav-wrap::after {
        display: none;
      }
    }
  }

  .right-panel {
    display: flex;
    align-content: center;
    align-items: center;
    justify-content: flex-end;
    height: var(--el-nav-height);
    transition: var(--el-transition);

    :deep() {
      [class*='ri-'] {
        margin-left: var(--el-margin);
        color: var(--el-color-grey);
        cursor: pointer;
      }

      button {
        [class*='ri-'] {
          margin-left: 0;
          color: var(--el-color-white);
          cursor: pointer;
        }
      }
    }
  }
}
</style>
