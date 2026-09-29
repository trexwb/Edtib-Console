//! 本地数据库域命令。
//!
//! 迁移前后对照：老项目前端通过 HTTP 调用 `electron/` 内 Express 服务的
//! `/api/*` 接口读写 Knex/SQLite；Tauri 版由 Rust 直接持有 SQLite 连接，
//! 前端改为 `invoke('db_status')` 等命令调用（无 HTTP、无本地端口）。

use tauri::State;

use crate::db::DatabaseStatus;
use crate::error::AppResult;
use crate::state::AppState;

/// 本地数据库状态：文件路径、迁移数量、SQLite 版本。
#[tauri::command]
pub fn db_status(state: State<'_, AppState>) -> AppResult<DatabaseStatus> {
    state.db.status()
}
