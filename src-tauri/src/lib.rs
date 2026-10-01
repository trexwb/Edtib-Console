//! EDTIB控制中台 —— Tauri v2 桌面端（由 Electron 迁移而来）
//!
//! 骨架阶段模块划分（详见 `docs/electron-to-tauri.md`）：
//! - `commands`：按业务域拆分的 Tauri 命令，替代老项目 electron/ 内的 Express 路由
//!   （前端经 `src/bridge` 以 `window.electronAPI.*` 的旧签名调用，见 `docs/migration-coverage.md`）
//! - `db`：Rust 侧 SQLite 访问与迁移，替代老项目 Knex。SQLite 能力**保留**，
//!   用于未来 AI 与异步事务处理；**不作为**本地业务数据缓存
//! - `paths`：应用数据目录 / 文档目录解析与越界防护（供 `commands::fs` 使用）
//! - `proxy`：请求转发（本地鉴权、二次加密、签名、解密、信封回包）
//! - `schedule`：定时任务，替代老项目 node-schedule
//! - `update`：在线更新，替代老项目 electron-updater
//! - `error` / `state`：统一错误类型与全局状态

mod commands;
mod config;
mod crypt;
mod db;
mod error;
mod js;
mod models;
mod paths;
mod proxy;
mod response;
mod schedule;
mod state;
mod update;

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

            // 0. 密钥自检：先绑定密钥文件（<AppData>/console.env），再校验本地链路凭证
            //    打包后的应用从 Finder 启动不会继承 shell 环境变量，密钥文件是实际注入入口
            config::init(handle.path().app_data_dir().ok());
            let missing = config::missing_env();
            if !missing.is_empty() {
                log::error!(
                    "本地链路密钥未配置或长度非法: {}（请在 .env / 密钥文件 console.env 注入；所有转发请求将被拒绝）",
                    missing.join(", ")
                );
            }

            // 1. 打开本地 SQLite 并执行 migrations
            let database = db::Database::open(&handle)?;
            app.manage(state::AppState::new(database));

            // 2. 更新包暂存（check_update 下载完成写入，confirm_update 消费）
            app.manage(update::PendingUpdate::default());

            // 3. 拉起定时任务调度
            schedule::spawn(&handle);

            log::info!(
                "EDTIB控制中台 启动完成，本地数据目录: {}",
                handle.path().app_data_dir()?.display()
            );
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 应用信息 / 版本更新（bridge: app.*）
            commands::app::app_info,
            commands::app::get_app_version,
            commands::app::check_update,
            commands::app::confirm_update,
            commands::app::restart_app,
            // 本地数据库（bridge: db.*，等价老 electron 内 Express 的 /api 读写）
            commands::db::db_status,
            commands::db::db_find_all,
            commands::db::db_get_list,
            commands::db::db_find_one,
            commands::db::db_create,
            commands::db::db_update,
            commands::db::db_delete,
            commands::db::db_bulk_create,
            // 本地文件系统（bridge: fs.*，路径限定在应用数据目录 / 文档目录内）
            commands::fs::fs_read_file,
            commands::fs::fs_write_file,
            commands::fs::fs_delete_file,
            commands::fs::fs_list_files,
            commands::fs::fs_get_user_data_path,
            commands::fs::fs_get_documents_path,
            commands::fs::fs_exists,
            // 请求转发（渲染层 axios → invoke → Rust 代理 → gateway）
            commands::proxy::proxy_request,
            // 定时任务（bridge: system.* 的调度状态 + 手动触发）
            commands::schedule::list_tasks,
            commands::schedule::supported_tasks,
            commands::schedule::run_task,
            commands::system::system_get_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
