/**
 * @description window.electronAPI 全局声明（Electron -> Tauri 迁移后的兼容挂载点）
 *
 * 接口契约已收敛到 `src/bridge/types.ts`，通道/事件名映射见 `src/bridge/channels.ts`；
 * 本文件只保留 Window 全局挂载声明，避免同一接口在两处重复定义导致类型漂移。
 * @Author: trexwb
 * @Date: 2026-04-15 23:05
 */

import type { ElectronAPI } from '/@/bridge/types'

declare global {
  interface Window {
    /**
     * Tauri 宿主下由 `setupBridge()`（src/main.ts 启动时调用）挂载；
     * 浏览器宿主下不存在，`isElectron()` 为 false，`requestBridge` 全部走 HTTP。
     */
    electronAPI: ElectronAPI
  }
}

export type { ElectronAPI }
