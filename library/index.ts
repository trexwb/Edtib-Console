import type { App } from 'vue'
// 加载雪碧图
import 'virtual:svg-icons-register'
// 加载全局样式样式
import { createHead } from '@vueuse/head'
import './styles/vab.scss'
// 加载图标
import { VabIcon } from 'vsv-icon'
import 'vsv-icon/dist/style.css'

export const setupVab = (app: App<Element>) => {
  app.use(createHead())
  app.component('VabIcon', VabIcon)
  // 加载插件
  const Plugins = import.meta.glob('./plugins/*.ts', { eager: true })
  Object.getOwnPropertyNames(Plugins).forEach((key) => {
    const plugin: any = Plugins[key]
    app.use(plugin.default)
  })
}
