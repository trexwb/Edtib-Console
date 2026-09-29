//! EDTIB控制中台 —— Tauri v2 桌面端（由 Electron 迁移而来）
//!
//! 骨架阶段模块划分（详见 `docs/electron-to-tauri.md`）：
//! - `commands`：按业务域拆分的 Tauri 命令，替代老项目 electron/ 内的 Express 路由
//! - `db`：Rust 侧 SQLite 访问与迁移，替代老项目 Knex。SQLite 能力**保留**，
//!   用于未来 AI 与异步事务处理；**不作为**本地业务数据缓存
//! - `schedule`：定时任务，替代老项目 node-schedule
//! - `error` / `state`：统一错误类型与全局状态

mod commands;
mod config;
mod crypt;
mod db;
mod error;
mod js;
mod models;
mod proxy;
mod response;
mod schedule;
mod state;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 单实例：老项目曾出现「多次启动导致本地服务未退出」的问题，改由运行时统一保证，
        // 且该插件必须最先注册。
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let handle = app.handle().clone();

            // 1. 打开本地 SQLite 并执行 migrations
            let database = db::Database::open(&handle)?;
            app.manage(state::AppState::new(database));

            // 2. 拉起定时任务调度
            schedule::spawn(&handle);

            log::info!(
                "EDTIB控制中台 启动完成，本地数据目录: {}",
                handle.path().app_data_dir()?.display()
            );
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app::app_info,
            commands::db::db_status,
            commands::proxy::proxy_request,
            commands::schedule::list_tasks,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
