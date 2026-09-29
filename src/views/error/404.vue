<!--
 * @Author: trexwb
 * @Date: 2023-11-14 11:28:18
 * @LastEditors: trexwb
 * @LastEditTime: 2024-11-25 14:01:02
 * @FilePath: /common/console/src/views/error/404.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2024 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div class="error-container">
    <div class="error-content">
      <div class="pic-error">
        <vab-icon class="error-svg" icon="404" is-custom-svg />
      </div>
      <div class="bullshit">
        <div class="bullshit-oops">{{ oops }}</div>
        <div class="bullshit-headline">{{ headline }}</div>
        <div class="bullshit-info">{{ info }}</div>
        <router-link v-slot="{ navigate }" custom to="/">
          <el-button type="primary" @click="navigate">{{ btn }}</el-button>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
const oops = ref<string>(translate('抱歉！'))
const headline = ref<string>(translate('当前页面不存在。'))
const info = ref<string>(translate('请检查您输入的网址是否正确，或点击下面的按钮返回首页。'))
const btn = ref<string>(translate('返回首页'))
</script>

<style lang="scss">
@use './scss/error';
</style>
