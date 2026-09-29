//! Tauri 命令模块：按业务域拆分的 IPC 命令入口。
//!
//! 路由变化：老项目由 Express 暴露 HTTP 路由（`electron/src/route`），
//! Tauri 版改为 `#[tauri::command]`，前端用 `invoke()` 直接调用（无 HTTP 端口）。

pub mod app;
pub mod db;
pub mod proxy;
pub mod schedule;
