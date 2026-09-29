<!--
 * @Author: trexwb
 * @Date: 2026-09-10
 * @FilePath: /console/web/src/views/fastener/ai/usage.vue
 * @Description: 用量与行为统计（Fastener AI 运维）
 * 一花一世界，一叶一如来
 * Copyright (c) 2026 by 杭州大美, All Rights Reserved.
-->
<template>
  <div class="comprehensive-table-container table-auto-height">
    <vab-query-form v-permissions="{ permission: ['fastenerAi:read'] }">
      <vab-query-form-top-panel>
        <el-form :inline="true" label-width="80px" :model="queryForm" @submit.prevent>
          <el-form-item :label="translate('统计窗口')">
            <el-select v-model="queryForm.days" :placeholder="translate('请选择')">
              <el-option :label="translate('近7天')" :value="7" />
              <el-option :label="translate('近30天')" :value="30" />
              <el-option :label="translate('近90天')" :value="90" />
            </el-select>
          </el-form-item>
          <el-form-item :label="translate('客户')">
            <el-input v-model.trim="queryForm.customerId" clearable :placeholder="translate('客户ID/手机号/邮箱/昵称')"
              @keyup.enter="fetchData" />
          </el-form-item>
          <el-form-item>
            <el-button :icon="Search" :loading="state.loading" native-type="submit" type="primary"
              @click="fetchData">{{ translate('查询') }}</el-button>
            <el-button :icon="Refresh" @click="handleReset">{{ translate('重置') }}</el-button>
          </el-form-item>
        </el-form>
      </vab-query-form-top-panel>
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
      <el-col v-for="card in metricCards" :key="card.key" :lg="6" :md="8" :sm="12" :xs="24">
        <el-card class="metric-card" shadow="hover">
          <div class="metric-label">{{ card.label }}</div>
          <div class="metric-value">{{ card.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-alert v-if="windowText" class="window-alert" :closable="false" show-icon :title="windowText" type="info" />

    <el-row :gutter="20">
      <el-col :lg="12" :md="24" :sm="24" :xs="24">
        <el-card class="chart-card" shadow="never">
          <template #header>
            <vab-icon icon="bar-chart-2-line" />
            {{ translate('工具调用分布') }}
          </template>
          <div v-if="toolRows.length" class="chart-wrapper">
            <vab-chart :option="chartOption" />
          </div>
          <el-empty v-else class="vab-data-empty" :description="translate('暂无数据')" />
        </el-card>
      </el-col>
      <el-col :lg="12" :md="24" :sm="24" :xs="24">
        <el-card class="chart-card" shadow="never">
          <template #header>
            <vab-icon icon="table-line" />
            {{ translate('客户用量排行') }}
          </template>
          <el-table v-loading="state.loading" :border="true" :data="customerRows" :max-height="320" :stripe="true">
            <el-table-column align="center" :label="translate('客户')" show-overflow-tooltip>
              <template #default="{ row }">
                <div>{{ row.nickname || '-' }}</div>
                <div style="color: var(--el-text-color-secondary); font-size: 12px">
                  {{ row.mobile || row.email || '' }}
                </div>
              </template>
            </el-table-column>
            <el-table-column align="center" :label="translate('调用次数')" prop="calls" show-overflow-tooltip />
            <el-table-column align="center" :label="translate('消耗积分')" prop="credits" show-overflow-tooltip />
            <template #empty>
              <el-empty class="vab-data-empty" :description="translate('暂无数据')" />
            </template>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="chart-card" shadow="never">
          <template #header>
            <vab-icon icon="line-chart-line" />
            {{ translate('工具调用明细') }}
          </template>
          <el-table v-loading="state.loading" :border="true" :data="toolRows" :stripe="true">
            <el-table-column v-for="(item, index) in finallyColumns" :key="index" align="center" :label="item.label"
              :prop="item.prop" show-overflow-tooltip :width="item.width" :min-width="item.minWidth">
              <template v-if="item.prop === 'rate'" #default="{ row }">{{ successRate(row) }}</template>
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
import { Refresh, Search } from '@element-plus/icons-vue'
import { fastenerAiUsageStats } from '/@/api/fastenerAi'
import { getStorage, setStorage } from '/@/utils/storage'
import VabDraggable from 'vuedraggable'

const templateName = 'FastenerAiUsage'
defineOptions({
  name: templateName,
})

const state = reactive({
  loading: false,
})

const queryForm = reactive({
  customerId: '',
  days: 30,
})

/* 列显示控制：与临时标准库 temp.vue 保持同一范式 */
const columns = ref<any>([
  {
    label: translate('工具'),
    prop: 'tool',
    disableCheck: true,
  },
  {
    label: translate('调用次数'),
    prop: 'calls',
    disableCheck: false,
  },
  {
    label: translate('成功次数'),
    prop: 'success',
    disableCheck: false,
  },
  {
    label: translate('成功率'),
    prop: 'rate',
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
const checkList = ref<any>(myCheckList[templateName] || ['tool', 'calls', 'success', 'rate'])
const finallyColumns = computed(() => {
  return columns.value.filter((item: any) => checkList.value.includes(item.prop))
})

const changeCheck = () => {
  const savedCheckList = getStorage('checkList') || {}
  savedCheckList[templateName] = JSON.parse(JSON.stringify(checkList.value))
  savedCheckList[`${templateName}Order`] = columns.value.map((item: any) => item.prop || item.key)
  setStorage('checkList', savedCheckList)
}

const stats = ref<any>({})

const toolRows = computed(() => stats.value?.tool_calls?.by_tool || [])
const customerRows = computed(() => stats.value?.top_customers || [])

const rate = (numerator: number, denominator: number) => {
  const den = Number(denominator || 0)
  if (!den) return '-'
  return `${((Number(numerator || 0) / den) * 100).toFixed(1)}%`
}

const windowText = computed(() => {
  const win = stats.value?.window || {}
  if (!win.startAt && !win.endAt) return ''
  return `${translate('统计窗口')}: ${win.startAt || '-'} ~ ${win.endAt || '-'}`
})

const metricCards = computed(() => {
  const toolCalls = stats.value?.tool_calls || {}
  const usages = stats.value?.usages || {}
  return [
    { key: 'sessions', label: translate('会话数'), value: stats.value?.sessions || 0 },
    { key: 'messages', label: translate('消息数'), value: stats.value?.messages || 0 },
    { key: 'messageTokens', label: translate('消息 Tokens'), value: stats.value?.message_tokens || 0 },
    { key: 'total', label: translate('工具调用总数'), value: toolCalls.total || 0 },
    { key: 'confirmedRate', label: translate('确认率'), value: rate(toolCalls.confirmed, toolCalls.total) },
    { key: 'successRate', label: translate('成功率'), value: rate(toolCalls.success, toolCalls.total) },
    { key: 'credits', label: translate('消耗积分'), value: usages.credits || 0 },
    { key: 'promptTokens', label: translate('提示词 Tokens'), value: usages.promptTokens || 0 },
    { key: 'completionTokens', label: translate('补全 Tokens'), value: usages.completionTokens || 0 },
  ]
})

const successRate = (row: any = {}) => rate(row.success, row.calls)

const chartOption = computed<any>(() => {
  const list = [...toolRows.value]
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 10, left: 10, right: 30, bottom: 10, containLabel: true },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: { type: 'category', data: list.map((item: any) => item.tool) },
    series: [
      {
        name: translate('调用次数'),
        type: 'bar',
        barMaxWidth: 18,
        itemStyle: { borderRadius: [0, 4, 4, 0] },
        data: list.map((item: any) => item.calls),
      },
    ],
  }
})

const fetchData = async () => {
  try {
    if (state.loading) return
    state.loading = true
    const res: any = await fastenerAiUsageStats({
      customerId: queryForm.customerId,
      days: queryForm.days,
    })
    stats.value = res?.data || {}
    state.loading = false
  } catch (error) {
    state.loading = false
    console.error('Fetch usage stats error:', error)
  }
}

const handleReset = () => {
  queryForm.customerId = ''
  queryForm.days = 30
  fetchData()
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

.window-alert {
  margin-bottom: 20px;
}

.chart-card {
  margin-bottom: 20px;
}

.chart-wrapper {
  height: 320px;
}
</style>
