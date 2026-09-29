//! 全局应用状态，由 Tauri 托管（`app.manage`），命令通过 `State<'_, AppState>` 取用。

use crate::db::Database;

pub struct AppState {
    /// 本地 SQLite 连接（替代老项目 electron/ 内的 Express + Knex 本地服务）。
    ///
    /// 定位：SQLite 能力保留，用于未来 AI 与异步事务处理；
    /// **不作为**本地业务数据的缓存使用（本机不承担业务数据缓存职责）。
    pub db: Database,
}

impl AppState {
    pub fn new(db: Database) -> Self {
        Self { db }
    }
}
