/**
 * @description 离线优先请求桥接器
 * 优先使用 IPC 直连本地数据库，失败时 fallback 到 HTTP
 * @Author: trexwb
 * @Date: 2026-04-15 23:00
 *
 * 迁移说明（Tauri v2）：
 * - 本文件与老项目 `client/console/web/src/utils/requestBridge.ts` 完全等价（老 web 构建同样没有
 *   `window.electronAPI`，因此本地 IPC 分支在浏览器宿主下始终走 fallback）；
 * - `http` 分支调用的 `/@/utils/request` 在 Tauri 宿主下已切换为 IPC 转发（命令 `proxy_request`，
 *   见 `src/utils/tauriAdapter.ts`），即：老「渲染层 → 本地 Express 服务」的链路已由该命令等价替换，
 *   本文件无需改动调用口径；
 * - 本地 IPC 能力（`electronAPI.db/fs/system`）在新项目中无对应命令（新架构下 SQLite 不作为渲染层
 *   缓存、文件读写由 Rust 侧直接完成），因此 `ipc*` 分支在 Tauri 宿主下不可达，统一走 HTTP；
 *   差异决策记录见 `docs/migration-coverage.md`（未迁移项 N-*）与 `docs/offline-and-proxy-architecture.md`。
 */

import request from '/@/utils/request'
import { isElectron } from '/@/utils/host'

/** 统一响应包装结构（与后端约定一致） */
interface ResponseWrapper<T = any> {
  code: number
  message: string
  timestamp?: string
  data: T | null
}

// IPC 调用超时时间（毫秒）
const IPC_TIMEOUT = 5000

const cloneForIpc = (value: any): any => {
  if (value === undefined || value === null) return value
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return value
  }
}

// IPC 数据库调用（直接调用 electronAPI.db[method]，而非通过 electronAPI[channel] 函数调用）
const ipcDbCall = async (method: string, table: string, ...args: any[]): Promise<any> => {
  if (!isElectron()) {
    throw new Error('Not in Electron environment')
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`IPC db.${method} timeout after ${IPC_TIMEOUT}ms`))
    }, IPC_TIMEOUT)

    ;(window.electronAPI.db as any)[method](table, ...args.map(cloneForIpc))
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

// IPC 文件系统调用（直接调用 electronAPI.fs[method]）
const ipcFsCall = async (method: string, ...args: any[]): Promise<any> => {
  if (!isElectron()) {
    throw new Error('Not in Electron environment')
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`IPC fs.${method} timeout after ${IPC_TIMEOUT}ms`))
    }, IPC_TIMEOUT)

    ;(window.electronAPI.fs as any)[method](...args.map(cloneForIpc))
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

// IPC 系统调用（直接调用 electronAPI.system[method]）
const ipcSystemCall = async (method: string, ...args: any[]): Promise<any> => {
  if (!isElectron()) {
    throw new Error('Not in Electron environment')
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`IPC system.${method} timeout after ${IPC_TIMEOUT}ms`))
    }, IPC_TIMEOUT)

    ;(window.electronAPI.system as any)[method](...args.map(cloneForIpc))
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
        const result = await ipcDbCall('getList', options.ipc.table, options.ipc.filters, options.ipc.order, options.ipc.limit, options.ipc.offset)
        const data = result.data || result
        if (data && data.list && data.list.length > 0) {
          return { total: data.total || 0, list: data.list || [] }
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
        const data = result && result.data !== undefined ? result.data : result
        if (data && data !== null && data !== undefined && (typeof data !== 'object' || Object.keys(data).length > 0)) {
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
        const data = result.data || result
        if (data && Array.isArray(data) && data.length > 0) {
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
        return result.data || result
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
        return result.data || result
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
  }): Promise<ResponseWrapper> => {
    // 优先 IPC（离线删除）
    if (options.ipc && isElectron()) {
      try {
        const response = await ipcDbCall('delete', options.ipc.table, options.ipc.id)
        return response.data || response
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
    
    return {
      code: 500,
      message: 'No available method',
      timestamp: new Date().toISOString(),
      data: null
    }
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
        const content = await ipcFsCall('readFile', options.ipc.filePath)
        const text = typeof content === 'string' ? content : content?.data
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
  }): Promise<ResponseWrapper<string>> => {
    if (!isElectron()) {
      console.warn('[writeFile] Not in Electron environment')
      return {
        code: 400,
        message: 'Not in Electron environment',
        timestamp: new Date().toISOString(),
        data: null
      }
    }
    
    try {
      const response = await ipcFsCall('writeFile', options.ipc.filePath, options.ipc.data)
      if (response && response.code === 200) {
        return response.data || response
      }
      return (response.data || response) || {
        code: 500,
        message: 'Unknown error',
        timestamp: new Date().toISOString(),
        data: null
      }
    } catch (error: any) {
      console.error('[writeFile failed]', error)
      return {
        code: 500,
        message: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
        data: null
      }
    }
  },
  
  /**
   * 获取系统信息
   * IPC: system.getInfo()
   */
  getSystemInfo: async (): Promise<ResponseWrapper> => {
    if (!isElectron()) {
      return {
        code: 200,
        message: 'success',
        timestamp: new Date().toISOString(),
        data: {
          platform: 'web',
          arch: 'unknown',
          hostname: 'unknown',
        }
      }
    }
    
    try {
      const response = await ipcSystemCall('getInfo')
      if (response && response.code === 200) {
        return response
      }
      return response || {
        code: 500,
        message: 'Unknown error',
        timestamp: new Date().toISOString(),
        data: null
      }
    } catch (error: any) {
      console.error('[getSystemInfo failed]', error)
      return {
        code: 500,
        message: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
        data: null
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
