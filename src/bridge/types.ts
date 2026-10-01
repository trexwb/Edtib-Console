/**
 * @description 桥接层类型定义（Electron -> Tauri 迁移唯一收敛点）
 *
 * 说明：
 *  - 原 Electron 版本中这些接口以全局声明形式维护在 `src/types/electron.d.ts`；
 *    迁移后统一收敛到本文件，electron.d.ts 只保留 Window 全局挂载声明并从此处 re-export。
 *  - 方法签名与旧 preload（`electron/src/preload.ts`）保持一致，保证上层业务代码
 *    （`src/utils/requestBridge.ts` 等）零改动即可切换到 Tauri invoke 实现；
 *  - 返回值类型按 **Rust 侧实际回包** 声明：数据类命令返回 `{ code, message, timestamp, data }` 信封
 *    （老主进程 ipcMain.handle 同款结构），`db.getList` 例外，直接返回 `{ total, list }`。
 * @Author: trexwb
 */

/** 统一响应信封（与 Rust `src-tauri/src/response.rs::Envelope` 字段一致） */
export interface BridgeEnvelope<T = any> {
  code: number
  message: string
  timestamp: string
  data: T | null
}

/** 分页结果（`db_get_list` 裸返回，老实现未加信封，前端分页总数依赖该结构） */
export interface ListResult<T = any> {
  total: number
  list: T[]
}

/** 更新信息（字段与 Rust `update.rs::UpdateInfo::to_json` 对齐） */
export interface UpdateInfo {
  version: string
  /** [迁移新增] 当前运行版本 */
  currentVersion?: string
  /** [迁移新增] 发布日期，Rust 侧字段名为 date */
  date?: string
  releaseNotes?: string
  /** [迁移新增] 更新目标（platform_arch，如 darwin_aarch64） */
  target?: string
}

/** 下载进度载荷（Rust 侧 emit 的是对象而非裸数字，前端直接当数字用会得到 NaN） */
export interface DownloadProgress {
  percent: number
  transferred: number
  total: number | null
}

/** 系统信息 */
export interface SystemInfo {
  platform: string
  arch: string
  hostname: string
  cpus: number
  /** [迁移限制] 未引入系统信息库依赖，内存字段返回空串 */
  totalMemory: string
  freeMemory: string
  versions: {
    node: string
    chrome: string
    electron: string
  }
  /** [迁移新增] Tauri 由系统 WebView 承载，真实内核版本见该字段 */
  webview?: string
}

/**
 * 桥接接口（与 Electron preload 暴露的 window.electronAPI 同构；
 * 老项目声明的 `cacheFile` 在 console 无消费方，迁移时不再保留）
 */
export interface ElectronAPI {
  // === 版本与更新 API ===
  getAppVersion: () => Promise<string>
  checkUpdate: () => Promise<void>
  /** [迁移补全] 安装已下载的更新包（Rust `confirm_update`）；老 Electron 由 quitAndInstall 承担 */
  confirmUpdate: () => Promise<void>
  restartApp: () => void
  // 事件回调源自 ipcRenderer.on，首个参数为 IpcRendererEvent；
  // [迁移调整] 返回注销函数，组件卸载时调用，避免重复注册导致同一回调多次触发
  onUpdateAvailable: (callback: (event: unknown, info: UpdateInfo) => void) => () => void
  onUpdateNotAvailable: (callback: (event: unknown, info: UpdateInfo) => void) => () => void
  onDownloadProgress: (callback: (event: unknown, payload: DownloadProgress) => void) => () => void
  onUpdateDownloaded: (callback: (event: unknown, info: UpdateInfo) => void) => () => void

  // === 数据库操作 API ===
  db: {
    findAll: (table: string, filters?: Record<string, any>) => Promise<BridgeEnvelope<any[]>>
    getList: (
      table: string,
      filters?: Record<string, any>,
      order?: any[],
      limit?: number,
      offset?: number
    ) => Promise<ListResult>
    findOne: (table: string, id: number | string) => Promise<BridgeEnvelope<any>>
    create: (table: string, data: Record<string, any>) => Promise<BridgeEnvelope<any>>
    update: (table: string, id: number | string, data: Record<string, any>) => Promise<BridgeEnvelope<any>>
    delete: (table: string, id: number | string) => Promise<BridgeEnvelope<any>>
    bulkCreate: (table: string, data: Record<string, any>[]) => Promise<BridgeEnvelope<any>>
  }

  // === 文件系统 API ===
  fs: {
    readFile: (filePath: string) => Promise<BridgeEnvelope<string | null>>
    writeFile: (filePath: string, data: string) => Promise<BridgeEnvelope<string>>
    deleteFile: (filePath: string) => Promise<boolean>
    listFiles: (dir: string) => Promise<string[]>
    getUserDataPath: () => Promise<string>
    getDocumentsPath: () => Promise<string>
    exists: (filePath: string) => Promise<boolean>
  }

  // === 系统信息 API ===
  system: {
    getPlatform: () => string
    getArch: () => string
    getVersions: () => { node: string; chrome: string; electron: string }
    getInfo: () => Promise<BridgeEnvelope<SystemInfo>>
  }
}

/** 更新事件回调签名（供 bridge 内部注册使用） */
export type UpdateEventCallback = (event: unknown, payload: any) => void
