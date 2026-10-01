/**
 * @description 运行宿主环境判定（Electron / Tauri / 浏览器）
 *
 * 迁移背景：老项目 `client/console` 存在两个运行宿主——
 * - `web/` 浏览器构建：axios 直连本地 Express 服务（`https://localhost.edtib.com:64580/api/*`）；
 * - `electron/` 桌面端：渲染层通过 `window.electronAPI`（preload.js）走 IPC。
 *
 * 新项目 `edtib/console`（Tauri v2）只有一个宿主形态：webview + Rust 命令，
 * 本地 HTTP 服务已取消（见 docs/migration-coverage.md）。因此前端需要统一的宿主判定，
 * 用于选择「IPC 转发（Tauri）」或「axios 默认 adapter（浏览器调试）」。
 *
 * @Author: trexwb
 * @Date: 2026-09-29
 */

export type HostKind = 'electron' | 'tauri' | 'browser'

/**
 * 是否存在 `window.electronAPI`（老 electron 宿主的探测口径，`requestBridge` 沿用该判断选择
 * IPC 或 HTTP）。新项目由 `src/bridge` 的 `setupBridge()` 在 Tauri 宿主下挂载同名对象，
 * 因此桌面端为 true、浏览器宿主为 false；命名保留是为了与老 `requestBridge.ts` 完全等价。
 */
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && (window as any).electronAPI !== undefined
}

/**
 * 是否运行在 Tauri webview 中。
 * Tauri v2 运行时注入 `window.__TAURI_INTERNALS__`；显式开启 `withGlobalTauri` 时注入 `window.__TAURI__`。
 */
export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false
  const scope = window as any
  return (
    scope.__TAURI_INTERNALS__ !== undefined ||
    scope.__TAURI__ !== undefined ||
    scope.__TAURI_IPC__ !== undefined
  )
}

/** 当前宿主类型（判定顺序：electron → tauri → browser）。 */
export const hostKind = (): HostKind => (isElectron() ? 'electron' : isTauri() ? 'tauri' : 'browser')
