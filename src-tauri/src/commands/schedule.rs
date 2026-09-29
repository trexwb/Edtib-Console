//! 调度相关命令：等价老项目 `electronAPI.system` 中与定时任务相关的调用面 + 调度状态查询。

use serde_json::Value;
use tauri::AppHandle;

use crate::schedule;

/// 列出全部调度行及其运行时状态。
#[tauri::command]
pub fn list_tasks() -> Vec<schedule::TaskState> {
    schedule::states()
}

/// 已迁移任务白名单（`handler.require` 的取值域）。
#[tauri::command]
pub fn supported_tasks() -> Vec<String> {
    schedule::SUPPORTED_TASKS
        .iter()
        .map(|name| name.to_string())
        .collect()
}

/// 立即执行一次指定任务（调试/手动触发用，等价老项目手动 import 后调用）。
///
/// 与老实现一致：任务内部异常不抛出（老实现 catch 后仅打印），统一以
/// `{ ok, result | error }` 形式返回，避免 invoke 层与业务错误码混淆。
#[tauri::command]
pub async fn run_task(app: AppHandle, require: String) -> Value {
    match schedule::run_once(&app, &require).await {
        Ok(result) => serde_json::json!({ "ok": true, "result": result }),
        Err(error) => serde_json::json!({ "ok": false, "error": error }),
    }
}
