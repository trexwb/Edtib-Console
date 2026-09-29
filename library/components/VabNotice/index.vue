<!--
 * @Author: trexwb
 * @Date: 2023-11-14 11:28:18
 * @LastEditors: trexwb
 * @LastEditTime: 2025-03-28 09:14:55
 * @FilePath: /client/console/library/components/VabNotice/index.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2024 by 杭州大美, All Rights Reserved. 
-->
<template>
  <el-badge type="danger" :value="badge">
    <el-popover placement="bottom" trigger="hover" :width="305">
      <template #reference>
        <vab-icon icon="notification-2-line" />
      </template>
      <el-tabs v-model="activeName" @tab-click="handleClick">
        <el-tab-pane :label="translate('通知')" name="notice">
          <div class="notice-list">
            <el-scrollbar>
              <ul v-if="badge">
                <li v-for="(item, index) in notices" :key="index">
                  <el-avatar :size="45" :src="item.image">
                    <img src="/@/assets/avatar.svg" alt="Default Avatar" />
                  </el-avatar>
                  <span v-html="item.notice" />
                </li>
              </ul>
              <el-empty v-else description="暂无数据" />
            </el-scrollbar>
          </div>
        </el-tab-pane>
      </el-tabs>
      <div class="notice-clear" @click="handleClearNotice">
        <el-button text>
          <vab-icon icon="close-circle-line" />
          <span>{{ translate('清空消息') }}</span>
        </el-button>
      </div>
    </el-popover>
  </el-badge>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { useSettingsStore } from '/@/store/modules/settings'

defineOptions({
  name: 'VabNotice',
})

const $baseMessage = inject<any>('$baseMessage')
const settingsStore = useSettingsStore()
const { theme } = storeToRefs(settingsStore)
const activeName = ref<string>('notice')
const notices = ref<Array<any>>([])
const badge = ref<any>(undefined)

const fetchData = async () => {
  // notices.value = [
  //   {
  //     email: '@email',
  //     image: 'https://i.gtimg.cn/club/item/face/img/8/15918_100.gif',
  //     notice: 'github开源地址：<a target="_blank" href="https://github.com/chuzhixin/vue-admin-better">点我</a>',
  //   },
  //   {
  //     email: '@email',
  //     image: 'https://i.gtimg.cn/club/item/face/img/0/15640_100.gif',
  //     notice: 'Admin Pro：<a target="_blank" href="https://vue-admin-beautiful.com/admin-pro">点我</a>',
  //   },
  //   {
  //     email: '@email',
  //     image: 'https://i.gtimg.cn/club/item/face/img/9/15919_100.gif',
  //     notice: 'Admin Plus：<a target="_blank" href="https://vue-admin-beautiful.com/admin-plus">点我</a>',
  //   },
  //   {
  //     email: '@email',
  //     image: 'https://i.gtimg.cn/club/item/face/img/8/15918_100.gif',
  //     notice: 'Shop Vite：<a target="_blank" href="https://vue-admin-beautiful.com/shop-vite">点我</a>',
  //   },
  // ]
  // badge.value = notices.value.length
  // const { data } = await getList()
  // notices.value = data.list
  // badge.value = data.total === 0 ? undefined : data.total
}

const handleClick = () => {
  fetchData()
}

const handleClearNotice = () => {
  badge.value = ''
  notices.value = []
  $baseMessage('清空消息成功', 'success', 'hey')
}

onBeforeMount(() => {
  if (theme.value.showNotice) fetchData()
})
</script>

<style lang="scss" scoped>
:deep() {
  .el-tabs__active-bar {
    min-width: 28px;
  }
}

.notice-list {
  height: 315px;

  ul {
    padding: 0 15px 0 0;
    margin: 0;

    li {
      display: flex;
      align-items: center;
      padding: 10px 0 15px 0;

      &:hover {
        background-color: var(--el-color-primary-light-9);
        border-radius: var(--el-border-radius-base);
      }

      :deep() {
        .el-avatar {
          flex-shrink: 0;
          width: 50px;
          height: 50px;
          border-radius: 50%;
        }
      }

      span {
        margin-left: 10px;
      }
    }
  }
}

.notice-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0 0 0;
  font-size: var(--el-font-size-default);
  text-align: center;
  cursor: pointer;
  border-top: 1px solid var(--el-border-color);
}
</style>
