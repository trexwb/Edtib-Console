/**
 * @description 双向同步服务
 * 本地数据与云端同步，支持离线写入、在线同步
 * 使用新的 Gateway 同步 API
 * @Author: trexwb
 * @Date: 2026-04-15 23:10
 */

import request from '/@/utils/request'
import requestBridge from '/@/utils/requestBridge'

// 同步状态
interface SyncStatus {
  lastSyncTime: number | null
  pendingChanges: number
  isSyncing: boolean
  error: string | null
}

// 同步配置
interface SyncConfig {
  tables: string[] // 需要同步的表
  syncInterval: number // 同步间隔（毫秒）
  batchSize: number // 每次同步的批量大小
}

// 默认同步配置
const DEFAULT_SYNC_CONFIG: SyncConfig = {
  tables: ['accounts', 'customers', 'products', 'categories', 'standards', 'shapes', 'users', 'serials', 'enums'],
  syncInterval: 60000, // 1 分钟
  batchSize: 100,
}

/**
 * 双向同步服务
 * 使用 Gateway 同步 API
 */
class SyncService {
  private config: SyncConfig
  private status: SyncStatus
  private syncTimer: number | null = null
  private pendingQueue: Map<string, any[]> = new Map() // 待同步队列
  
  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config }
    this.status = {
      lastSyncTime: null,
      pendingChanges: 0,
      isSyncing: false,
      error: null,
    }
  }
  
  /**
   * 初始化同步服务
   */
  async init(): Promise<void> {
    // 加载上次同步时间
    await this.loadLastSyncTime()
    
    // 启动定时同步
    this.startSyncTimer()
    
    console.log('[SyncService] initialized')
  }
  
  /**
   * 加载上次同步时间
   */
  private async loadLastSyncTime(): Promise<void> {
    if (!requestBridge.isElectron()) return
    
    try {
      const data = await requestBridge.readFile({
        ipc: { filePath: 'sync-status.json' },
      })
      
      if (data) {
        const status = JSON.parse(data)
        this.status.lastSyncTime = status.lastSyncTime
        this.status.pendingChanges = status.pendingChanges || 0
      }
    } catch (error) {
      console.warn('[SyncService] loadLastSyncTime failed:', error)
    }
  }
  
  /**
   * 保存同步状态
   */
  private async saveSyncStatus(): Promise<void> {
    if (!requestBridge.isElectron()) return
    
    try {
      await requestBridge.writeFile({
        ipc: {
          filePath: 'sync-status.json',
          data: JSON.stringify({
            lastSyncTime: this.status.lastSyncTime,
            pendingChanges: this.status.pendingChanges,
          }),
        },
      })
    } catch (error) {
      console.error('[SyncService] saveSyncStatus failed:', error)
    }
  }
  
  /**
   * 启动定时同步
   */
  private startSyncTimer(): void {
    if (this.syncTimer) return
    
    this.syncTimer = window.setInterval(() => {
      this.sync()
    }, this.config.syncInterval)
  }
  
  /**
   * 停止定时同步
   */
  stopSyncTimer(): void {
    if (this.syncTimer) {
      window.clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }
  
  /**
   * 执行同步
   */
  async sync(): Promise<boolean> {
    if (this.status.isSyncing) {
      console.log('[SyncService] already syncing, skip')
      return false
    }
    
    this.status.isSyncing = true
    this.status.error = null
    
    try {
      // 1. 推送本地变更到云端
      await this.pushChanges()
      
      // 2. 拉取云端变更到本地
      await this.pullChanges()
      
      // 3. 更新同步状态
      this.status.lastSyncTime = Date.now()
      await this.saveSyncStatus()
      
      console.log('[SyncService] sync completed')
      return true
    } catch (error) {
      this.status.error = error instanceof Error ? error.message : 'Sync failed'
      console.error('[SyncService] sync failed:', error)
      return false
    } finally {
      this.status.isSyncing = false
    }
  }
  
  /**
   * 推送本地变更到云端
   * 使用新的 Gateway 同步 API: POST /front/sync/logs
   */
  private async pushChanges(): Promise<void> {
    for (const [table, changes] of this.pendingQueue.entries()) {
      if (changes.length === 0) continue
      
      try {
        // 映射表名到 Gateway 日志表
        const logTable = this.mapToLogTable(table)
        if (!logTable) continue
        
        // 批量推送
        const batch = changes.slice(0, this.config.batchSize)
        const { data } = await request({
          url: '/front/sync/logs',
          method: 'post',
          data: {
            table: logTable,
            data: batch,
          },
        })
        
        if (data?.success) {
          // 移除已同步的变更
          this.pendingQueue.set(table, changes.slice(this.config.batchSize))
          this.status.pendingChanges = this.getTotalPendingChanges()
          console.log(`[SyncService] pushed ${table} -> ${logTable}, count: ${batch.length}`)
        }
      } catch (error) {
        console.warn(`[SyncService] push ${table} failed, keep in queue:`, error)
      }
    }
  }
  
  /**
   * 映射业务表名到日志表名
   */
  private mapToLogTable(table: string): string | null {
    const mapping: Record<string, string> = {
      docs_hits: 'docs_hits',
      docs_browsers: 'docs_browsers',
      docs_logs: 'docs_logs',
      downloads_logs: 'downloads_logs',
    }
    return mapping[table] || null
  }
  
  /**
   * 拉取云端变更到本地
   * 使用新的 Gateway 同步 API: POST /front/sync/standards
   */
  private async pullChanges(): Promise<void> {
    for (const table of this.config.tables) {
      try {
        let page = 1
        let hasMore = true
        const allChanges: any[] = []
        
        // 分页拉取直到没有更多数据
        while (hasMore) {
          const { data } = await request({
            url: '/front/sync/standards',
            method: 'post',
            data: {
              table,
              page,
              pageSize: this.config.batchSize,
            },
          })
          
          if (data?.changes && data.changes.length > 0) {
            allChanges.push(...data.changes)
            
            // 检查是否有更多数据
            if (data.changes.length < this.config.batchSize) {
              hasMore = false
            } else {
              page++
            }
          } else {
            hasMore = false
          }
        }
        
        // 写入本地数据库
        if (allChanges.length > 0) {
          await this.applyChangesToLocal(table, allChanges)
          console.log(`[SyncService] pulled ${table}, count: ${allChanges.length}`)
        }
      } catch (error) {
        console.warn(`[SyncService] pull ${table} failed:`, error)
      }
    }
  }
  
  /**
   * 应用云端变更到本地数据库
   */
  private async applyChangesToLocal(table: string, changes: any[]): Promise<void> {
    if (!requestBridge.isElectron()) return
    
    for (const change of changes) {
      try {
        // 检查是否已存在
        const existing = await requestBridge.getOne({
          ipc: { table, id: change.id },
        })
        
        if (existing?.data) {
          // 更新
          await requestBridge.update({
            ipc: { table, id: change.id, data: change },
          })
        } else {
          // 创建
          await requestBridge.create({
            ipc: { table, data: change },
          })
        }
      } catch (error) {
        console.warn(`[SyncService] apply change failed for ${table}:`, change, error)
      }
    }
  }
  
  /**
   * 记录待同步变更
   */
  recordChange(table: string, change: any): void {
    if (!this.config.tables.includes(table)) return
    
    const queue = this.pendingQueue.get(table) || []
    queue.push(change)
    this.pendingQueue.set(table, queue)
    this.status.pendingChanges++
  }
  
  /**
   * 获取总待同步变更数
   */
  private getTotalPendingChanges(): number {
    let total = 0
    for (const changes of this.pendingQueue.values()) {
      total += changes.length
    }
    return total
  }
  
  /**
   * 获取同步状态
   */
  getStatus(): SyncStatus {
    return { ...this.status }
  }
  
  /**
   * 强制同步
   */
  async forceSync(): Promise<boolean> {
    return await this.sync()
  }
  
  /**
   * 清空待同步队列
   */
  clearPendingQueue(): void {
    this.pendingQueue.clear()
    this.status.pendingChanges = 0
  }
  
  /**
   * 销毁服务
   */
  destroy(): void {
    this.stopSyncTimer()
    this.clearPendingQueue()
  }
}

// 导出单例
const syncService = new SyncService()
export default syncService
export { SyncService }
export type { SyncStatus, SyncConfig }
