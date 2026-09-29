<!--
 * @Author: trexwb
 * @Date: 2026-09-10
 * @FilePath: /console/web/src/views/fastener/ai/tools.vue
 * @Description: AI 工具白名单（Fastener AI 运维，只读）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <el-alert class="tips-alert" :closable="false" show-icon
      :title="translate('工具白名单由服务端注册表下发，写工具需人工确认后才执行，全部调用留痕于「工具调用审计」')"
      type="info" />
    <vab-query-form v-permissions="{ permission: ['fastenerAi:read'] }">
      <vab-query-form-right-panel :span="24">
        <el-button @click="fetchData">
          <vab-icon icon="refresh-line" />
        </el-button>
        <el-popover popper-class="custom-table-checkbox" trigger="hover">
          <template #reference>
            <el-button>
              <vab-icon icon="settings-line" />
            </el-button>
          </template>
          <el-checkbox-group v-model="checkList" @change="changeCheck">
            <vab-draggable item-key="element" :list="columns">
              <template #item="{ element }">
                <div>
                  <el-checkbox :checked="element.checked" :disabled="element.disableCheck" :label="element.label"
                    :value="element.prop">
                    {{ element.label }}
                  </el-checkbox>
                </div>
              </template>
            </vab-draggable>
          </el-checkbox-group>
        </el-popover>
      </vab-query-form-right-panel>
    </vab-query-form>

    <el-row :gutter="20">
      <el-col :lg="6" :md="8" :sm="12" :xs="24">
        <el-card class="metric-card" shadow="hover">
          <div class="metric-label">
            <vab-icon icon="robot-2-line" />
            {{ translate('白名单工具数') }}
          </div>
          <div class="metric-value">{{ toolList.length }}</div>
        </el-card>
      </el-col>
      <el-col :lg="6" :md="8" :sm="12" :xs="24">
        <el-card class="metric-card" shadow="hover">
          <div class="metric-label">
            <vab-icon icon="shield-keyhole-line" />
            {{ translate('需人工确认') }}
          </div>
          <div class="metric-value">{{ confirmCount }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="chart-card" shadow="never">
          <template #header>
            <vab-icon icon="tools-line" />
            {{ translate('工具白名单') }}
          </template>
          <el-table v-loading="state.loading" :border="true" :data="toolList" :stripe="true">
            <el-table-column align="center" :label="translate('序号')" type="index" width="80" />
            <el-table-column v-for="(item, index) in finallyColumns" :key="index" align="center" :label="item.label"
              :prop="item.prop" show-overflow-tooltip :width="item.width" :min-width="item.minWidth">
              <template v-if="item.prop === 'need_confirm'" #default="{ row }">
                <el-tag v-if="needConfirm(row)" type="warning">{{ translate('需人工确认') }}</el-tag>
                <el-tag v-else type="success">{{ translate('直接执行') }}</el-tag>
              </template>
              <template v-else-if="item.prop === 'description'" #default="{ row }">
                {{ toolDescription(row.tool) }}
              </template>
            </el-table-column>
            <template #empty>
              <el-empty class="vab-data-empty" :description="translate('暂无数据')" />
            </template>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { fastenerAiToolManifest } from '/@/api/fastenerAi'
import { getStorage, setStorage } from '/@/utils/storage'
import VabDraggable from 'vuedraggable'

const templateName = 'FastenerAiTools'
defineOptions({
  name: templateName,
})

const state = reactive({
  loading: false,
})

/* 列显示控制：与临时标准库 temp.vue 保持同一范式 */
const columns = ref<any>([
  {
    label: translate('工具'),
    prop: 'tool',
    minWidth: 200,
    disableCheck: true,
  },
  {
    label: translate('需人工确认'),
    prop: 'need_confirm',
    width: 150,
    disableCheck: false,
  },
  {
    label: translate('说明'),
    prop: 'description',
    minWidth: 220,
    disableCheck: false,
  },
])
// 恢复用户拖拽后的列顺序（与显隐配置同存于 checkList storage 的 `${templateName}Order` 键）
const cachedColumnOrder = (getStorage('checkList') || {})[`${templateName}Order`]
if (Array.isArray(cachedColumnOrder) && cachedColumnOrder.length) {
  columns.value.sort((a: any, b: any) => {
    const ai = cachedColumnOrder.indexOf(a.prop || a.key)
    const bi = cachedColumnOrder.indexOf(b.prop || b.key)
    return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi)
  })
}
const myCheckList = getStorage('checkList') || {}
const checkList = ref<any>(myCheckList[templateName] || ['tool', 'need_confirm', 'description'])
const finallyColumns = computed(() => {
  return columns.value.filter((item: any) => checkList.value.includes(item.prop))
})

const changeCheck = () => {
  const savedCheckList = getStorage('checkList') || {}
  savedCheckList[templateName] = JSON.parse(JSON.stringify(checkList.value))
  savedCheckList[`${templateName}Order`] = columns.value.map((item: any) => item.prop || item.key)
  setStorage('checkList', savedCheckList)
}

const toolList = ref<any[]>([])

/* 能力说明：后端 manifest 未下发 description，按注册表工具名本地映射 */
const TOOL_DESCRIPTION: Record<string, string> = {
  search_standards: '检索产品标准',
  search_docs: '检索资料文档',
  get_credits: '查询积分余额',
  get_subscription: '查询订阅状态',
  calc_formula: '计算公式（体积/重量）',
  download_doc: '下载资料文档',
  create_order: '创建订单（订阅/积分，需确认）',
}

const toolDescription = (tool: string) => {
  const description = TOOL_DESCRIPTION[String(tool || '')]
  return description ? translate(description) : '—'
}

const needConfirm = (row: any = {}) => Number(row.need_confirm ?? row.needConfirm ?? 0) === 1

const confirmCount = computed(() => toolList.value.filter((item: any) => needConfirm(item)).length)

const fetchData = async () => {
  try {
    if (state.loading) return
    state.loading = true
    const res: any = await fastenerAiToolManifest()
    const payload = res?.data || {}
    toolList.value = payload.list || []
    state.loading = false
  } catch (error) {
    state.loading = false
    console.error('Fetch tool manifest error:', error)
  }
}

const init = () => {
  fetchData()
}

/* 生命周期钩子 */
onMounted(() => { /* 组件挂载后逻辑 */ })
onBeforeUnmount(() => { /* 组件卸载前清理逻辑 */ })
onBeforeMount(() => {
  init()
})
</script>

<style lang="scss" scoped>
.tips-alert {
  margin-bottom: 20px;
}

.metric-card {
  margin-bottom: 20px;

  .metric-label {
    color: var(--el-text-color-secondary);
    font-size: 13px;
  }

  .metric-value {
    margin-top: 8px;
    font-size: 24px;
    font-weight: 600;
  }
}

.chart-card {
  margin-bottom: 20px;
}
</style>
