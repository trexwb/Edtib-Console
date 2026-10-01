/**
 * @description 桥接模块（Electron IPC / preload 调用点统一收敛层）
 *
 * 迁移背景：
 *   旧版本由 Electron preload 通过 contextBridge 暴露 window.electronAPI（db / fs / system /
 *   版本更新等能力），主进程由 `electron/` 内的 Express 服务与 ipcMain.handle 承接；
 *   迁移到 Tauri v2 后这些能力由 Rust 命令提供（`src-tauri/src/commands/*`），
 *   本模块把同一套接口（`src/bridge/types.ts` 的 ElectronAPI）转发到 `invoke()`，
 *   使上层业务代码（`src/utils/requestBridge.ts` 的 `ipc:` 分支、设置页更新面板）无需感知运行时差异。
 *
 * 使用方式：
 *   1) 推荐：`import { bridge } from '/@/bridge'` 后直接调用 bridge.db.getList(...)；
 *   2) 兼容：`src/main.ts` 启动时调用 setupBridge()，在 Tauri 环境下把 bridge 挂到 window.electronAPI，
 *      历史调用点 `window.electronAPI.xxx` 与 requestBridge 的 `isElectron()` 探测依然可用。
 *
 * 宿主差异：
 *   - 浏览器宿主（npm run dev 直开页面）没有 Tauri 运行时，本模块所有数据类调用直接 reject，
 *     requestBridge 据此降级为 HTTP（与在线模式行为一致）；
 *   - 网络请求不走本桥接：渲染层 axios 由 `src/utils/tauriAdapter.ts` 转发到 `proxy_request`
 *     （Rust 代理负责本地验签、二次加密、x-sign 与解密回包）。
 * @Author: trexwb
 */

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { isTauri } from '/@/utils/host'
import { BRIDGE_CHANNELS, BRIDGE_EVENTS } from './channels'
import type { BridgeEnvelope, ElectronAPI, ListResult, SystemInfo } from './types'

export * from './types'
export { BRIDGE_CHANNELS, BRIDGE_EVENTS, ELECTRON_IPC_CHANNEL_MAP } from './channels'

/** 应用版本兜底值（与 package.json / tauri.conf.json 保持一致） */
const APP_VERSION_FALLBACK = '1.0.0'

/** 桥接能力是否可用（等价老实现的 isElectron()，供上层做能力判断） */
export const isBridgeAvailable = (): boolean => isTauri()

/** 已告警过的命令，避免同一失败重复刷日志 */
const warnedCommands = new Set<string>()

const warnUnavailable = (command: string, error: unknown) => {
  if (warnedCommands.has(command)) return
  warnedCommands.add(command)
  console.warn(`[bridge] Tauri 命令 "${command}" 调用失败，已按兜底策略降级`, error)
}

/** 统一 invoke 封装：非 Tauri 环境直接 reject（调用方据此降级 HTTP） */
const call = <T>(command: string, payload?: Record<string, any>): Promise<T> => {
  if (!isTauri()) {
    return Promise.reject(new Error(`[bridge] 当前非 Tauri 环境，命令 ${command} 不可用`))
  }
  return payload === undefined ? invoke<T>(command) : invoke<T>(command, payload)
}

/** 更新事件监听注册表（登记 entry 以便注销，避免重复注册导致回调多次触发） */
interface UpdateListenerEntry {
  event: string
  callback: (event: unknown, payload: any) => void
  unlisten?: () => void
}
const updateListeners: UpdateListenerEntry[] = []

const registerUpdateListener = (event: string, callback: (event: unknown, payload: any) => void): (() => void) => {
  if (typeof callback !== 'function') return () => {}
  const entry: UpdateListenerEntry = { callback, event }
  updateListeners.push(entry)
  if (isTauri()) {
    // Rust 侧按 BRIDGE_EVENTS emit（见 src-tauri/src/update.rs），事件载荷即第二个参数
    void listen(event, (tauriEvent) => callback(tauriEvent, (tauriEvent as any)?.payload))
      .then((unlisten) => {
        entry.unlisten = unlisten
      })
      .catch((error) => {
        warnUnavailable(event, error)
      })
  }
  return () => {
    const index = updateListeners.indexOf(entry)
    if (index !== -1) updateListeners.splice(index, 1)
    entry.unlisten?.()
  }
}

/** 浏览器宿主系统信息兜底（保持与 Rust system_get_info 相同的字段结构） */
const fallbackSystemInfo = (): SystemInfo => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
  const platform = /mac/i.test(ua) ? 'darwin' : /win/i.test(ua) ? 'win32' : /linux/i.test(ua) ? 'linux' : 'unknown'
  return {
    platform,
    arch: 'unknown',
    hostname: '',
    cpus: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 0 : 0,
    totalMemory: '',
    freeMemory: '',
    versions: {
      node: '',
      chrome: (ua.match(/Chrome\/([\d.]+)/) || [])[1] || '',
      electron: '',
    },
    webview: (ua.match(/(?:AppleWebKit|WebKit)\/([\d.]+)/) || [])[1] || '',
  }
}

/** 浏览器宿主信封兜底（保持 requestBridge 读取 `code === 200` / `data` 的口径可用） */
const fallbackEnvelope = <T>(data: T): BridgeEnvelope<T> => ({
  code: 200,
  message: 'success',
  timestamp: new Date().toISOString(),
  data,
})

/**
 * 桥接实现（与 Electron preload 暴露的接口同构）
 */
export const bridge: ElectronAPI = {
  // === 版本与更新 ===
  getAppVersion: async (): Promise<string> => {
    try {
      return (await call<string>(BRIDGE_CHANNELS.app.getAppVersion)) || APP_VERSION_FALLBACK
    } catch (error) {
      warnUnavailable(BRIDGE_CHANNELS.app.getAppVersion, error)
      return APP_VERSION_FALLBACK
    }
  },
  checkUpdate: async (): Promise<void> => {
    try {
      await call(BRIDGE_CHANNELS.app.checkUpdate)
    } catch (error) {
      // 更新服务不可用（未配置端点 / 网络失败）时静默降级：
      // Rust 侧已下发 update-not-available 事件，前端据此收起 loading
      warnUnavailable(BRIDGE_CHANNELS.app.checkUpdate, error)
    }
  },
  confirmUpdate: async (): Promise<void> => {
    await call(BRIDGE_CHANNELS.app.confirmUpdate)
  },
  restartApp: (): void => {
    // 接口签名为同步（沿用 Electron 版），内部异步触发
    void call(BRIDGE_CHANNELS.app.restartApp).catch((error) => {
      warnUnavailable(BRIDGE_CHANNELS.app.restartApp, error)
    })
  },
  onUpdateAvailable: (callback) => registerUpdateListener(BRIDGE_EVENTS.updateAvailable, callback),
  onUpdateNotAvailable: (callback) => registerUpdateListener(BRIDGE_EVENTS.updateNotAvailable, callback),
  onDownloadProgress: (callback) => registerUpdateListener(BRIDGE_EVENTS.downloadProgress, callback),
  onUpdateDownloaded: (callback) => registerUpdateListener(BRIDGE_EVENTS.updateDownloaded, callback),

  // === 数据库（失败即抛错，由 requestBridge 降级为 HTTP） ===
  db: {
    findAll: (table: string, filters?: Record<string, any>) =>
      call<BridgeEnvelope<any[]>>(BRIDGE_CHANNELS.db.findAll, { table, filters }),
    getList: (table: string, filters?: Record<string, any>, order?: any[], limit?: number, offset?: number) =>
      call<ListResult>(BRIDGE_CHANNELS.db.getList, { table, filters, order, limit, offset }),
    findOne: (table: string, id: number | string) =>
      call<BridgeEnvelope<any>>(BRIDGE_CHANNELS.db.findOne, { table, id }),
    create: (table: string, data: Record<string, any>) =>
      call<BridgeEnvelope<any>>(BRIDGE_CHANNELS.db.create, { table, data }),
    update: (table: string, id: number | string, data: Record<string, any>) =>
      call<BridgeEnvelope<any>>(BRIDGE_CHANNELS.db.update, { table, id, data }),
    delete: (table: string, id: number | string) =>
      call<BridgeEnvelope<any>>(BRIDGE_CHANNELS.db.delete, { table, id }),
    bulkCreate: (table: string, data: Record<string, any>[]) =>
      call<BridgeEnvelope<any>>(BRIDGE_CHANNELS.db.bulkCreate, { table, data }),
  },

  // === 文件系统（失败即抛错，由 requestBridge 降级为 HTTP） ===
  fs: {
    readFile: (filePath: string) => call<BridgeEnvelope<string | null>>(BRIDGE_CHANNELS.fs.readFile, { filePath }),
    writeFile: (filePath: string, data: string) =>
      call<BridgeEnvelope<string>>(BRIDGE_CHANNELS.fs.writeFile, { filePath, data }),
    deleteFile: (filePath: string) => call<boolean>(BRIDGE_CHANNELS.fs.deleteFile, { filePath }),
    listFiles: (dir: string) => call<string[]>(BRIDGE_CHANNELS.fs.listFiles, { dir }),
    getUserDataPath: () => call<string>(BRIDGE_CHANNELS.fs.getUserDataPath),
    getDocumentsPath: () => call<string>(BRIDGE_CHANNELS.fs.getDocumentsPath),
    exists: (filePath: string) => call<boolean>(BRIDGE_CHANNELS.fs.exists, { filePath }),
  },

  // === 系统信息 ===
  system: {
    getPlatform: (): string => fallbackSystemInfo().platform,
    getArch: (): string => fallbackSystemInfo().arch,
    getVersions: () => {
      const info = fallbackSystemInfo()
      return { node: info.versions.node, chrome: info.versions.chrome, electron: info.versions.electron }
    },
    getInfo: async (): Promise<BridgeEnvelope<SystemInfo>> => {
      try {
        return await call<BridgeEnvelope<SystemInfo>>(BRIDGE_CHANNELS.system.getInfo)
      } catch (error) {
        warnUnavailable(BRIDGE_CHANNELS.system.getInfo, error)
        return fallbackEnvelope(fallbackSystemInfo())
      }
    },
  },
}

let installed = false

/**
 * 在 Tauri 环境下把桥接实现挂载为 window.electronAPI（兼容历史调用点，幂等）
 */
export const setupBridge = (): ElectronAPI => {
  if (typeof window !== 'undefined' && isTauri() && !installed) {
    ;(window as any).electronAPI = bridge
    installed = true
    console.info('[bridge] Electron IPC -> Tauri invoke 桥接已安装（window.electronAPI）')
  }
  return bridge
}

/** 别名，语义同上 */
export const installBridge = setupBridge
