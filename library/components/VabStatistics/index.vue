<!--
 * @Author: trexwb
 * @Date: 2023-11-14 11:28:18
 * @LastEditors: trexwb
 * @LastEditTime: 2024-01-24 09:25:41
 * @FilePath: /front/console/library/components/VabStatistics/index.vue
 * @Description: 
 * 一花一世界，一叶一如来
 * Copyright (c) 2024 by 杭州大美, All Rights Reserved. 
-->
<template>
  <div></div>
</template>

<script lang="ts" setup>
// @ts-nocheck
defineOptions({
  name: 'VabStatistics',
})

// 网站访问量统计 如不需要请自行注释
onBeforeMount(() => {
  // if (location.hostname !== 'localhost' && !location.hostname.includes('127') && !location.hostname.includes('192')) {
  //   ;(function () {
  //     const hm = document.createElement('script')
  //     hm.src = 'https://hm.baidu.com/hm.js?820b686671af452e8a4e18952ce946d8'
  //     const s: any = document.getElementsByTagName('script')[0]
  //     s.parentNode.insertBefore(hm, s)
  //   })()
  //   ;(function (c, l, a, r, i, t, y) {
  //     c[a] =
  //       c[a] ||
  //       function () {
  //         // eslint-disable-next-line prefer-rest-params
  //         ;(c[a].q = c[a].q || []).push(arguments)
  //       }
  //     t = l.createElement(r)
  //     t.async = 1
  //     t.src = `https://www.clarity.ms/tag/${i}`
  //     y = l.getElementsByTagName(r)[0]
  //     y.parentNode.insertBefore(t, y)
  //   })(window, document, 'clarity', 'script', 'j9de7dmm7n')
  // }
})
</script>
