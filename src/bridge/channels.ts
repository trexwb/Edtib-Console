/**
 * @description Electron IPC 通道 -> Tauri invoke 命令 / 事件 映射表
 *
 * 旧实现：`electron/src/preload.ts` 通过 contextBridge 暴露 window.electronAPI，
 *        每个方法转发到 `ipcRenderer.invoke('<通道名>')`，主进程由 Express 路由 / ipcMain.handle 承接；
 * 新实现：`src/bridge` 把同一套方法转发到 `@tauri-apps/api` 的 `invoke('<命令名>')`，
 *        命令名与旧通道名保持「一一对应、语义相同」，Rust 侧按本表实现（src-tauri/src/commands/*）。
 *
 * Rust 侧实现约定：
 *   #[tauri::command] fn db_get_list(...) -> ...   // 前端 invoke('db_get_list', { table, filters, ... })
 * 参数以 camelCase 传入，Tauri 自动映射到 Rust 的 snake_case 形参。
 *
 * 与 books 项目的差异：console 不含 `cache-file` 通道（无消费方，且本地文件缓存由 Rust 侧直接完成）。
 * @Author: trexwb
 */

/** Tauri invoke 命令名（由旧 Electron IPC 通道名平移而来） */
export const BRIDGE_CHANNELS = {
  app: {
    getAppVersion: 'get_app_version',
    checkUpdate: 'check_update',
    confirmUpdate: 'confirm_update',
    restartApp: 'restart_app',
  },
  db: {
    findAll: 'db_find_all',
    getList: 'db_get_list',
    findOne: 'db_find_one',
    create: 'db_create',
    update: 'db_update',
    delete: 'db_delete',
    bulkCreate: 'db_bulk_create',
  },
  fs: {
    readFile: 'fs_read_file',
    writeFile: 'fs_write_file',
    deleteFile: 'fs_delete_file',
    listFiles: 'fs_list_files',
    getUserDataPath: 'fs_get_user_data_path',
    getDocumentsPath: 'fs_get_documents_path',
    exists: 'fs_exists',
  },
  system: {
    getInfo: 'system_get_info',
  },
} as const

/** Tauri 事件名（对应旧 Electron 主进程 webContents.send 的更新事件） */
export const BRIDGE_EVENTS = {
  updateAvailable: 'updater:update-available',
  updateNotAvailable: 'updater:update-not-available',
  downloadProgress: 'updater:download-progress',
  updateDownloaded: 'updater:update-downloaded',
} as const

/** 旧通道名 -> 新命令名 完整对照表（用于迁移审计 / Rust 侧对齐） */
export const ELECTRON_IPC_CHANNEL_MAP: ReadonlyArray<{ legacy: string; tauri: string; scope: string }> = [
  { legacy: 'get-app-version', tauri: BRIDGE_CHANNELS.app.getAppVersion, scope: 'app' },
  { legacy: 'check-update', tauri: BRIDGE_CHANNELS.app.checkUpdate, scope: 'app' },
  { legacy: 'confirm-update', tauri: BRIDGE_CHANNELS.app.confirmUpdate, scope: 'app' },
  { legacy: 'restart-app', tauri: BRIDGE_CHANNELS.app.restartApp, scope: 'app' },
  { legacy: 'db-find-all', tauri: BRIDGE_CHANNELS.db.findAll, scope: 'db' },
  { legacy: 'db-get-list', tauri: BRIDGE_CHANNELS.db.getList, scope: 'db' },
  { legacy: 'db-find-one', tauri: BRIDGE_CHANNELS.db.findOne, scope: 'db' },
  { legacy: 'db-create', tauri: BRIDGE_CHANNELS.db.create, scope: 'db' },
  { legacy: 'db-update', tauri: BRIDGE_CHANNELS.db.update, scope: 'db' },
  { legacy: 'db-delete', tauri: BRIDGE_CHANNELS.db.delete, scope: 'db' },
  { legacy: 'db-bulk-create', tauri: BRIDGE_CHANNELS.db.bulkCreate, scope: 'db' },
  { legacy: 'fs-read-file', tauri: BRIDGE_CHANNELS.fs.readFile, scope: 'fs' },
  { legacy: 'fs-write-file', tauri: BRIDGE_CHANNELS.fs.writeFile, scope: 'fs' },
  { legacy: 'fs-delete-file', tauri: BRIDGE_CHANNELS.fs.deleteFile, scope: 'fs' },
  { legacy: 'fs-list-files', tauri: BRIDGE_CHANNELS.fs.listFiles, scope: 'fs' },
  { legacy: 'fs-get-user-data-path', tauri: BRIDGE_CHANNELS.fs.getUserDataPath, scope: 'fs' },
  { legacy: 'fs-get-documents-path', tauri: BRIDGE_CHANNELS.fs.getDocumentsPath, scope: 'fs' },
  { legacy: 'fs-exists', tauri: BRIDGE_CHANNELS.fs.exists, scope: 'fs' },
  { legacy: 'system-get-info', tauri: BRIDGE_CHANNELS.system.getInfo, scope: 'system' },
  { legacy: 'update-available (event)', tauri: BRIDGE_EVENTS.updateAvailable, scope: 'event' },
  { legacy: 'update-not-available (event)', tauri: BRIDGE_EVENTS.updateNotAvailable, scope: 'event' },
  { legacy: 'download-progress (event)', tauri: BRIDGE_EVENTS.downloadProgress, scope: 'event' },
  { legacy: 'update-downloaded (event)', tauri: BRIDGE_EVENTS.updateDownloaded, scope: 'event' },
]
