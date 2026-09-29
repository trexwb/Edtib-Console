/**
 * @description Electron API TypeScript 类型声明
 * @Author: trexwb
 * @Date: 2026-04-15 23:05
 */

interface ElectronAPI {
  // === 版本与更新 API ===
  getAppVersion: () => Promise<string>
  checkUpdate: () => Promise<void>
  restartApp: () => void
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void
  onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => void
  onDownloadProgress: (callback: (percent: number) => void) => void
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void
  cacheFile: (filePath: string) => Promise<string>
  
  // === 数据库操作 API ===
  db: {
    findAll: (table: string, filters?: Record<string, any>) => Promise<any[] | null>
    getList: (table: string, filters?: Record<string, any>, order?: any[], limit?: number, offset?: number) => Promise<{ total: number; list: any[] }>
    findOne: (table: string, id: number | string) => Promise<any | null>
    create: (table: string, data: Record<string, any>) => Promise<any | null>
    update: (table: string, id: number | string, data: Record<string, any>) => Promise<any | null>
    delete: (table: string, id: number | string) => Promise<any | null>
    bulkCreate: (table: string, data: Record<string, any>[]) => Promise<any | null>
  }
  
  // === 文件系统 API ===
  fs: {
    readFile: (filePath: string) => Promise<string | null>
    writeFile: (filePath: string, data: string) => Promise<string | null>
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
    getInfo: () => Promise<SystemInfo>
  }
}

interface UpdateInfo {
  version: string
  releaseDate?: string
  releaseNotes?: string
}

interface SystemInfo {
  platform: string
  arch: string
  hostname: string
  cpus: number
  totalMemory: string
  freeMemory: string
  versions: {
    node: string
    chrome: string
    electron: string
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}