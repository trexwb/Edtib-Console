<!--
 * @Author: trexwb
 * @Date: 2026-09-10
 * @FilePath: /console/web/src/views/fastener/ai/vabAutoComponents/Bm25BlockView.vue
 * @Description: BM25 索引块详情抽屉（关键词 + 正文全文）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <el-drawer v-model="state.drawerFormVisible" append-to-body :before-close="handleClose" direction="rtl" size="55%"
    :title="translate('索引块详情')">
    <div class="bm25-block-view">
      <el-descriptions border :column="2" direction="horizontal">
        <el-descriptions-item>
          <template #label>{{ translate('编号') }}</template>
          {{ detail.id }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('来源类型') }}</template>
          {{ sourceTypeText(detail.sourceType) }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('来源ID') }}</template>
          {{ detail.sourceId }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('块序号') }}</template>
          {{ detail.chunkNo }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('标题') }}</template>
          {{ detail.title }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('访问级别') }}</template>
          {{ accessLevelText(detail.accessLevel) }}
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('状态') }}</template>
          <el-tag v-if="detail.status === 1" type="success">{{ translate('启用') }}</el-tag>
          <el-tag v-else type="info">{{ translate('禁用') }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item>
          <template #label>{{ translate('创建时间') }}</template>
          {{ detail.createdAt }}
        </el-descriptions-item>
      </el-descriptions>
      <el-divider content-position="left">
        {{ translate('关键词') }}
        <el-button :icon="DocumentCopy" link type="primary" @click="handleCopy(keywordsText)">{{ translate('复制') }}
        </el-button>
      </el-divider>
      <pre class="bm25-text-block">{{ keywordsText }}</pre>
      <el-divider content-position="left">
        {{ translate('正文') }}
        <el-button :icon="DocumentCopy" link type="primary" @click="handleCopy(detail.body)">{{ translate('复制') }}
        </el-button>
      </el-divider>
      <pre class="bm25-text-block">{{ detail.body }}</pre>
    </div>
    <template #footer>
      <el-button :icon="Close" @click="handleClose">{{ translate('关闭') }}</el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { Close, DocumentCopy } from '@element-plus/icons-vue'
import handleClipboard from '/@/utils/clipboard'

const templateName = 'Bm25BlockView'
defineOptions({
  name: templateName,
})

const detail = ref<any>({})
const keywordsText = ref<string>('-')

const state = reactive({
  drawerFormVisible: false,
})

const SOURCE_TYPE_MAP: Record<number, string> = {
  1: '产品标准',
  2: '解读',
  3: '知识库文档',
  4: '上传文件',
}

const ACCESS_LEVEL_MAP: Record<number, string> = {
  0: '免费',
  1: '订阅',
  2: '已购',
}

const sourceTypeText = (sourceType: number) => {
  const label = SOURCE_TYPE_MAP[Number(sourceType)]
  return label ? translate(label) : translate('未知')
}

const accessLevelText = (accessLevel: number) => {
  const label = ACCESS_LEVEL_MAP[Number(accessLevel)]
  return label ? translate(label) : translate('未知')
}

/* 关键词可能在库中存为 JSON 字符串，解析失败时原样展示 */
const formatKeywords = (keywords: any) => {
  if (keywords === null || keywords === undefined || keywords === '') return '-'
  if (typeof keywords === 'string') {
    try {
      const parsed = JSON.parse(keywords)
      return Array.isArray(parsed) ? parsed.join(' / ') : String(parsed)
    } catch {
      return keywords
    }
  }
  return Array.isArray(keywords) ? keywords.join(' / ') : String(keywords)
}

const showView = (row: any = {}) => {
  detail.value = row
  keywordsText.value = formatKeywords(row.keywords)
  state.drawerFormVisible = true
}

const handleCopy = (text: string) => {
  handleClipboard(text)
}

const open = () => {
  state.drawerFormVisible = true
}

const close = () => {
  state.drawerFormVisible = false
}

const handleClose = () => {
  close()
}

defineExpose({ showView, open, close })

/* 生命周期钩子 */
onMounted(() => { /* 组件挂载后逻辑 */ })
onBeforeUnmount(() => { /* 组件卸载前清理逻辑 */ })
</script>

<style lang="scss" scoped>
.bm25-text-block {
  max-height: 320px;
  padding: 10px 12px;
  overflow: auto;
  font-family: Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}
</style>
