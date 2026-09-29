<template>
  <vab-card :body-style="{ height: '222px' }" skeleton>
    <template #header>
      <vab-icon icon="line-chart-line" />
      {{ translate('流量概况(数据未接入)') }}
      <el-tag class="card-header-tag" type="success">{{ translate('日') }}</el-tag>
    </template>

    <vab-chart :option="option" />
    <div class="bottom">
      <div class="line-two">
        {{ translate('自上周以来') }}
        <span>{{ translate('提升 44%') }}</span>
      </div>
    </div>
  </vab-card>
</template>

<script lang="ts" setup>
import { translate } from '/@/i18n'
import { graphic } from 'echarts/core'
import { random } from 'lodash-es'
import { useSettingsStore } from '/@/store/modules/settings'
import { lightenColor } from '/@/utils/lightenColor'

const settingsStore = useSettingsStore()
const { color } = storeToRefs(settingsStore)
let timer: any
const updateTime = ref<any>()

const option = reactive<any>({
  tooltip: {
    trigger: 'axis',
    extraCssText: 'z-index:1',
  },
  grid: {
    top: '5%',
    left: '2%',
    right: '4%',
    bottom: '0%',
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: [],
    axisTick: {
      alignWithLabel: true,
    },
  },

  yAxis: {
    type: 'value',
  },

  series: {
    name: translate('浏览量'),
    type: 'line',
    data: [],
    smooth: true,
    areaStyle: {},
    itemStyle: {
      borderRadius: [0, 5, 5, 0],
      color: new graphic.LinearGradient(0, 0, 1, 0, [
        { offset: 0, color: lightenColor(color.value, 50) },
        { offset: 1, color: color.value },
      ]),
    },
  },
})

watch(
  color,
  () => {
    option.series.itemStyle.color = new graphic.LinearGradient(0, 0, 1, 0, [
      { offset: 0, color: lightenColor(color.value, 50) },
      { offset: 1, color: color.value },
    ])
  },
  { immediate: true }
)

onActivated(() => {
  const base = +new Date(2023, 10, 1)
  const oneDay = 24 * 3600 * 1000
  const date: any = []

  const data = [Math.random() * 1500]
  let now: any = new Date(base)
  updateTime.value = now

  const addData = (shift: boolean) => {
    now = [now.getFullYear(), now.getMonth() + 1, now.getDate()].join('/')
    date.push(now)
    data.push(random(2000, 4000))

    if (shift) {
      date.shift()
      data.shift()
    }
    now = new Date(+new Date(now) + oneDay)
    option.xAxis.data = []
    option.series.data = []
    option.xAxis.data = date
    option.series.data = data
  }

  for (let i = 1; i < 6; i++) {
    addData(false)
  }

  timer = setInterval(() => {
    addData(true)
  }, 5000)
})

onDeactivated(() => {
  clearInterval(timer)
})
</script>

<style lang="scss" scoped>
:deep() {
  .echarts {
    height: 140px !important;
  }
}

.bottom {
  padding-top: 20px;
  margin-top: 5px;
  text-align: left;
  border-top: 1px solid var(--el-border-color);
}

.line-two {
  span {
    color: var(--el-color-success);
  }
}
</style>
