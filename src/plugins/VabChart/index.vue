<template>
  <v-chart ref="VChartRef" :autoresize="autoresize" class="vab-chart" :option="option" @click="handleClick" @highlight="handleHighlight" />
</template>

<script lang="ts" setup>
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BarChart,
  BoxplotChart,
  CandlestickChart,
  CustomChart,
  EffectScatterChart,
  FunnelChart,
  GaugeChart,
  GraphChart,
  HeatmapChart,
  LineChart,
  LinesChart,
  MapChart,
  ParallelChart,
  PictorialBarChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  SunburstChart,
  ThemeRiverChart,
  TreeChart,
  TreemapChart,
} from 'echarts/charts'
import {
  AriaComponent,
  AxisPointerComponent,
  BrushComponent,
  CalendarComponent,
  DataZoomComponent,
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  DatasetComponent,
  GeoComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  ParallelComponent,
  PolarComponent,
  SingleAxisComponent,
  TimelineComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  TransformComponent,
  VisualMapComponent,
  VisualMapContinuousComponent,
  VisualMapPiecewiseComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers'
import VChart, { THEME_KEY } from 'vue-echarts'
import theme from './theme/vab-echarts-theme.json'

defineOptions({
  name: 'VabChart',
})

const props = defineProps({
  option: {
    type: Object,
    default: () => {},
  },
  autoresize: {
    type: Boolean,
    default: true,
  },
  renderer: {
    type: String,
    default: () => {
      return 'CanvasRenderer'
    },
  },
})

const VChartRef = ref<any>(null)

use([
  props.renderer === 'CanvasRenderer' ? CanvasRenderer : SVGRenderer,
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  RadarChart,
  MapChart,
  TreeChart,
  TreemapChart,
  GraphChart,
  GaugeChart,
  FunnelChart,
  ParallelChart,
  SankeyChart,
  BoxplotChart,
  CandlestickChart,
  EffectScatterChart,
  LinesChart,
  HeatmapChart,
  PictorialBarChart,
  ThemeRiverChart,
  SunburstChart,
  CustomChart,
  GridComponent,
  PolarComponent,
  GeoComponent,
  SingleAxisComponent,
  ParallelComponent,
  CalendarComponent,
  GraphicComponent,
  ToolboxComponent,
  TooltipComponent,
  AxisPointerComponent,
  BrushComponent,
  TitleComponent,
  TimelineComponent,
  MarkPointComponent,
  MarkLineComponent,
  MarkAreaComponent,
  LegendComponent,
  DataZoomComponent,
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  VisualMapComponent,
  VisualMapContinuousComponent,
  VisualMapPiecewiseComponent,
  AriaComponent,
  DatasetComponent,
  TransformComponent,
])

provide(THEME_KEY, theme)

const handleHighlight = (action: any) => {
  return action
}

const handleClick = (event: any) => {
  return event
}

const resize = () => {
  VChartRef.value.resize()
}

const clear = () => {
  VChartRef.value.clear()
}

const dispose = () => {
  VChartRef.value.dispose()
}

const getWidth = () => {
  return VChartRef.value.getWidth()
}

const getHeight = () => {
  return VChartRef.value.getHeight()
}
</script>

<style lang="scss" scoped>
.vab-chart {
  width: 100%;
  height: 100%;
}
</style>
