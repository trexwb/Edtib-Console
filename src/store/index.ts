/**
 * @description 导入所有 vuex 模块，自动加入namespaced:true，用于解决vuex命名冲突，请勿修改。
 */
import type { App } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
// 启用持久化插件，状态自动保存到 localStorage
pinia.use(piniaPluginPersistedstate)

export function setupStore(app: App<Element>) {
  app.use(pinia)
}

export default pinia
