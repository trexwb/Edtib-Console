<!--
 * @Author: trexwb
 * @Date: 2023-11-14 11:28:18
 * @LastEditors: trexwb
 * @LastEditTime: 2024-11-25 14:01:12
 * @FilePath: /common/console/src/views/error/503.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2024 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div class="error-container">
    <div class="error-content">
      <div class="pic-error">
        <vab-icon class="error-svg" icon="503" is-custom-svg />
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
const headline = ref<string>(translate('服务不可用。'))
const info = ref<string>(translate('服务器当前无法处理请求，可能是由于过载或正在进行维护。'))
const btn = ref<string>(translate('返回首页'))
</script>

<style lang="scss">
@use './scss/error';
</style>
