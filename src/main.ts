import App from './App.vue'

import ElementPlus from 'element-plus'
import ElementPlusLocaleZhCn from 'element-plus/es/locale/lang/zh-cn'
import VXETable from 'vxe-table'
import { setupVab } from '~/library'
import { setupI18n } from '/@/i18n'
import { setupRouter } from '/@/router'
import { setupStore } from '/@/store'

import JsonSchemaEditor from 'json-schema-editor-vue3'
// 虚拟滚动组件（用于大列表优化）
import { RecycleScroller, DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
// [迁移调整] Electron IPC -> Tauri invoke 桥接层（db / fs / system / 版本更新调用点统一收敛于 src/bridge）
import { setupBridge } from '/@/bridge'

// 必须早于任何 store / api 初始化：requestBridge 依据 window.electronAPI 是否存在选择 IPC 或 HTTP
setupBridge()

const app = createApp(App)
// 注册虚拟滚动组件为全局组件
app.component('RecycleScroller', RecycleScroller)
app.component('DynamicScroller', DynamicScroller)
app.component('DynamicScrollerItem', DynamicScrollerItem)
app.use(ElementPlus, { locale: ElementPlusLocaleZhCn }).use(VXETable).use(JsonSchemaEditor)

setupVab(app)
setupI18n(app)
setupStore(app)
setupRouter(app)
  .isReady()
  .then(() => app.mount('#app'))
