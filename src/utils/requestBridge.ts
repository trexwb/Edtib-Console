/**
 * @description 离线优先请求桥接器
 * 优先使用 IPC 直连本地数据库，失败时 fallback 到 HTTP
 * @Author: trexwb
 * @Date: 2026-04-15 23:00
 *
 * 迁移说明（Tauri v2）：
 * - `window.electronAPI` 不再由 Electron preload 注入，而由 `src/bridge`（`setupBridge()`，
 *   在 `src/main.ts` 启动时调用）在 Tauri 宿主下挂载，方法签名与老 preload 完全一致；
 *   通道名 -> Tauri 命令名对照见 `src/bridge/channels.ts`，Rust 侧实现见 `src-tauri/src/commands/*`；
 * - 因此 `ipc:` 分支在桌面端可达：本地 SQLite / 本地文件读写经 `db_*` / `fs_*` / `system_get_info`
 *   命令完成；命令未注册、表名不在白名单、本地表为空或调用失败时，一律降级到 HTTP（在线行为不变）；
 * - `http` 分支调用的 `/@/utils/request` 在 Tauri 宿主下已切换为 IPC 转发（两仓适配器均为
 *   `src/utils/tauriAdapter.ts` + 同一个命令 `proxy_request`，代理链路同构）；
 * - 浏览器宿主（`npm run dev` 直开页面）没有 Tauri 运行时，`isElectron()` 为 false，全部走 HTTP。
 *
 * [框架统一] books / console 两仓的本文件（逻辑与骨架）完全一致，改动此处必须双侧同步。
 */

import request from '/@/utils/request'
// [迁移调整] 统一走 src/bridge 桥接层：Tauri 环境下由 invoke 承载，Electron 兼容层同源
import { bridge, isBridgeAvailable } from '/@/bridge'
import type { BridgeEnvelope } from '/@/bridge/types'

// C-B4: IPC 方法白名单，仅允许显式声明的受控方法，杜绝 __proto__/constructor 等原型链或危险方法注入
const DB_METHODS: ReadonlySet<string> = new Set(['getList', 'findOne', 'findAll', 'create', 'update', 'delete'])
const FS_METHODS: ReadonlySet<string> = new Set(['readFile', 'writeFile', 'listFiles'])
const SYSTEM_METHODS: ReadonlySet<string> = new Set(['getInfo'])

// 检测本地 IPC 能力是否可用（迁移语义对齐：旧版判断 window.electronAPI，
// 现统一由 src/bridge 判定 —— Tauri 环境为 invoke 桥接，Electron 环境为兼容层）
const isElectron = (): boolean => {
  return isBridgeAvailable()
}

// IPC 调用超时时间（毫秒）
const IPC_TIMEOUT = 5000

// 序列化参数，防止 IPC 传递过程中对象引用被意外修改
const cloneForIpc = (value: any): any => {
  if (value === undefined || value === null) return value
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return value
  }
}

// IPC 数据库调用（直接调用 bridge.db[method]，而非通过 electronAPI[channel] 函数调用）
const ipcDbCall = async (method: string, table: string, ...args: any[]): Promise<any> => {
  if (!DB_METHODS.has(method)) {
    throw new Error(`Disallowed IPC db method: ${method}`)
  }
  if (!isElectron()) {
    throw new Error('Not in Electron environment')
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`IPC db.${method} timeout after ${IPC_TIMEOUT}ms`))
    }, IPC_TIMEOUT)

    // [迁移调整] 统一走 src/bridge 桥接层（Tauri invoke）
    const dbApi = bridge.db as unknown as Record<string, (...invokeArgs: any[]) => Promise<any>>
    dbApi[method](table, ...args.map(cloneForIpc))
      .then((result: any) => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch((error: any) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

// IPC 文件系统调用（直接调用 bridge.fs[method]）
const ipcFsCall = async (method: string, ...args: any[]): Promise<any> => {
  if (!FS_METHODS.has(method)) {
    throw new Error(`Disallowed IPC fs method: ${method}`)
  }
  if (!isElectron()) {
    throw new Error('Not in Electron environment')
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`IPC fs.${method} timeout after ${IPC_TIMEOUT}ms`))
    }, IPC_TIMEOUT)

    // [迁移调整] 统一走 src/bridge 桥接层（Tauri invoke）
    const fsApi = bridge.fs as unknown as Record<string, (...invokeArgs: any[]) => Promise<any>>
    fsApi[method](...args.map(cloneForIpc))
      .then((result: any) => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch((error: any) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

// IPC 系统调用（直接调用 bridge.system[method]）
const ipcSystemCall = async (method: string, ...args: any[]): Promise<any> => {
  if (!SYSTEM_METHODS.has(method)) {
    throw new Error(`Disallowed IPC system method: ${method}`)
  }
  if (!isElectron()) {
    throw new Error('Not in Electron environment')
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`IPC system.${method} timeout after ${IPC_TIMEOUT}ms`))
    }, IPC_TIMEOUT)

    // [迁移调整] 统一走 src/bridge 桥接层（Tauri invoke）
    const systemApi = bridge.system as unknown as Record<string, (...invokeArgs: any[]) => Promise<any>>
    systemApi[method](...args.map(cloneForIpc))
      .then((result: any) => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch((error: any) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

/**
 * 信封拆包：Rust 数据类命令统一返回 `{ code, message, timestamp, data }` 信封
 * （`db_get_list` 例外，裸返回 `{ total, list }`）；
 * `data === null` 视为「本地无该记录」，返回 null 由调用方降级 HTTP。
 */
const unwrap = (result: any): any => (result && result.data !== undefined ? result.data : result)

/** 浏览器宿主信封兜底（保持调用方读取 `code === 200` / `data` 的口径可用） */
const fallbackEnvelope = <T>(data: T): BridgeEnvelope<T> => ({
  code: 200,
  message: 'success',
  timestamp: new Date().toISOString(),
  data,
})

/**
 * 离线优先请求桥接器
 * 优先 IPC，失败时 fallback 到 HTTP
 */
const requestBridge = {
  /**
   * 获取列表数据（分页）
   * IPC: db.getList(table, filters, order, limit, offset)
   * HTTP: request({ url, method: 'post', data })
   */
  getList: async (options: {
    ipc?: {
      table: string
      filters?: any
      order?: any
      limit?: number
      offset?: number
    }
    http?: {
      url: string
      data?: any
    }
  }): Promise<{ total: number; list: any[] }> => {
    // 优先 IPC
    if (options.ipc && isElectron()) {
      try {
        const result = await ipcDbCall(
          'getList',
          options.ipc.table,
          options.ipc.filters,
          options.ipc.order,
          options.ipc.limit,
          options.ipc.offset
        )
        const data = unwrap(result)
        // 本地表为空（total=0 或 list 为空）时不采信 IPC 结果，继续降级 HTTP（在线行为不变）
        if (data && typeof data.total === 'number' && Array.isArray(data.list) && data.list.length > 0) {
          return { total: data.total || 0, list: data.list }
        }
      } catch (error) {
        console.warn('[IPC fallback to HTTP]', error)
      }
    }

    // Fallback HTTP
    if (options.http) {
      const { data } = await request({
        url: options.http.url,
        method: 'post',
        data: options.http.data,
      })
      return data || { total: 0, list: [] }
    }

    return { total: 0, list: [] }
  },

  /**
   * 获取单条数据
   * IPC: db.findOne(table, id)
   * HTTP: request({ url, method: 'post', data: { id } })
   */
  getOne: async (options: {
    ipc?: {
      table: string
      id?: number | string
    }
    http?: {
      url: string
      data?: { id?: number | number[] }
    }
  }): Promise<any> => {
    // 优先 IPC
    if (options.ipc && isElectron()) {
      try {
        const result = await ipcDbCall('findOne', options.ipc.table, options.ipc.id)
        const data = unwrap(result)
        if (data !== null && data !== undefined && (typeof data !== 'object' || Object.keys(data).length > 0)) {
          return data
        }
      } catch (error) {
        console.warn('[IPC fallback to HTTP]', error)
      }
    }

    // Fallback HTTP
    if (options.http) {
      const { data } = await request({
        url: options.http.url,
        method: 'post',
        data: options.http.data,
      })
      return data
    }

    return null
  },

  /**
   * 获取所有数据
   * IPC: db.findAll(table, filters)
   * HTTP: request({ url, method: 'post', data })
   */
  // 返回类型说明：IPC 路径返回数组，HTTP 路径可能返回 { list } 包裹结构，由调用方自行兼容
  getAll: async (options: {
    ipc?: {
      table: string
      filters?: any
    }
    http?: {
      url: string
      data?: any
    }
  }): Promise<any> => {
    // 优先 IPC
    if (options.ipc && isElectron()) {
      try {
        const result = await ipcDbCall('findAll', options.ipc.table, options.ipc.filters)
        const data = unwrap(result)
        if (Array.isArray(data) && data.length > 0) {
          return data
        }
      } catch (error) {
        console.warn('[IPC fallback to HTTP]', error)
      }
    }

    // Fallback HTTP
    if (options.http) {
      const { data } = await request({
        url: options.http.url,
        method: 'post',
        data: options.http.data,
      })
      return data || []
    }

    return []
  },

  /**
   * 创建数据
   * IPC: db.create(table, data)
   * HTTP: request({ url, method: 'post', data })
   */
  create: async (options: {
    ipc?: {
      table: string
      data: any
    }
    http?: {
      url: string
      data: any
    }
  }): Promise<any> => {
    // 优先 IPC（离线写入）
    if (options.ipc && isElectron()) {
      try {
        const result = await ipcDbCall('create', options.ipc.table, options.ipc.data)
        return unwrap(result)
      } catch (error) {
        console.warn('[IPC fallback to HTTP]', error)
      }
    }

    // Fallback HTTP
    if (options.http) {
      const { data } = await request({
        url: options.http.url,
        method: 'post',
        data: options.http.data,
      })
      return data
    }

    return null
  },

  /**
   * 更新数据
   * IPC: db.update(table, id, data)
   * HTTP: request({ url, method: 'post', data })
   */
  update: async (options: {
    ipc?: {
      table: string
      id: number | string
      data: any
    }
    http?: {
      url: string
      data: any
    }
  }): Promise<any> => {
    // 优先 IPC（离线更新）
    if (options.ipc && isElectron()) {
      try {
        const result = await ipcDbCall('update', options.ipc.table, options.ipc.id, options.ipc.data)
        return unwrap(result)
      } catch (error) {
        console.warn('[IPC fallback to HTTP]', error)
      }
    }

    // Fallback HTTP
    if (options.http) {
      const { data } = await request({
        url: options.http.url,
        method: 'post',
        data: options.http.data,
      })
      return data
    }

    return null
  },

  /**
   * 删除数据
   * IPC: db.delete(table, id)
   * HTTP: request({ url, method: 'post', data })
   */
  delete: async (options: {
    ipc?: {
      table: string
      id: number | string
    }
    http?: {
      url: string
      data: { id: number | number[] }
    }
  }): Promise<any> => {
    // 优先 IPC（离线删除）
    if (options.ipc && isElectron()) {
      try {
        const result = await ipcDbCall('delete', options.ipc.table, options.ipc.id)
        return unwrap(result)
      } catch (error) {
        console.warn('[IPC fallback to HTTP]', error)
      }
    }

    // Fallback HTTP
    if (options.http) {
      const { data } = await request({
        url: options.http.url,
        method: 'post',
        data: options.http.data,
      })
      return data
    }

    return null
  },

  /**
   * 文件读取
   * IPC: fs.readFile(filePath)
   * HTTP: 请求远程文件
   */
  readFile: async (options: {
    ipc?: {
      filePath: string
    }
    http?: {
      url: string
    }
  }): Promise<string | null> => {
    // 优先 IPC（本地文件）
    if (options.ipc && isElectron()) {
      try {
        const response = await ipcFsCall('readFile', options.ipc.filePath)
        const text = typeof response === 'string' ? response : unwrap(response)
        if (text) {
          return text
        }
      } catch (error) {
        console.warn('[IPC fallback to HTTP]', error)
      }
    }

    // Fallback HTTP（远程文件）
    if (options.http) {
      const { data } = await request({
        url: options.http.url,
        method: 'get',
      })
      return data ?? null
    }

    return null
  },

  /**
   * 文件写入（仅 IPC）
   * HTTP 不支持文件写入，仅本地
   */
  writeFile: async (options: {
    ipc: {
      filePath: string
      data: string
    }
  }): Promise<string | null> => {
    if (!isElectron()) {
      console.warn('[writeFile] Not in Electron environment')
      return null
    }

    try {
      const result = await ipcFsCall('writeFile', options.ipc.filePath, options.ipc.data)
      return unwrap(result)
    } catch (error) {
      console.error('[writeFile failed]', error)
      return null
    }
  },

  /**
   * 列出目录文件（仅 IPC）
   * IPC: fs.listFiles(dir)
   */
  listFiles: async (options: {
    ipc: {
      dir: string
    }
  }): Promise<string[]> => {
    if (!isElectron()) {
      console.warn('[listFiles] Not in Electron environment')
      return []
    }

    try {
      const result = await ipcFsCall('listFiles', options.ipc.dir)
      return unwrap(result) || []
    } catch (error) {
      console.error('[listFiles failed]', error)
      return []
    }
  },

  /**
   * 获取系统信息
   * IPC: system.getInfo（返回 `{ code, message, timestamp, data }` 信封）
   */
  getSystemInfo: async (): Promise<BridgeEnvelope> => {
    if (!isElectron()) {
      return fallbackEnvelope({
        platform: 'web',
        arch: 'unknown',
        hostname: 'unknown',
      })
    }

    try {
      return await ipcSystemCall('getInfo')
    } catch (error) {
      console.error('[getSystemInfo failed]', error)
      return {
        code: 500,
        message: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
        data: null,
      }
    }
  },

  // 工具方法
  isElectron,
  ipcDbCall,
  ipcFsCall,
  ipcSystemCall,
}

export default requestBridge
