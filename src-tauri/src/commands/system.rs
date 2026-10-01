//! 系统信息命令（对应 `src/bridge/channels.ts` 的 `system.getInfo`，等价老 `system-get-info`）。
//!
//! 与老实现的差异：
//!   * Electron 的 `process.versions`（node / chrome / electron）在 Tauri 下不存在，
//!     键结构保留并返回空串，真实内核版本由 `webview` 字段体现；
//!   * 内存总量 / 空闲量与主机名需要额外系统信息库（老项目由 Node `os` 模块提供）。
//!     本仓库不为此引入新依赖，故 `totalMemory` / `freeMemory` 返回空串、
//!     `hostname` 取环境变量（缺失时为空串）。CPU 核数由 `available_parallelism` 提供。
//!
//! 返回结构：统一信封 `{ code, message, timestamp, data }`，
//! 与 `src/utils/requestBridge.ts#getSystemInfo` 的 `response.code === 200` 判定口径一致。

use serde_json::json;

use crate::error::AppResult;
use crate::response::{self, Envelope};

/// Tauri 侧平台名（对齐 Node `os.platform()` 取值：darwin / win32 / linux）。
fn platform_name() -> &'static str {
    match std::env::consts::OS {
        "macos" => "darwin",
        "windows" => "win32",
        other => other,
    }
}

/// 主机名：与 Node `os.hostname()` 同源的进程环境变量（GUI 启动可能缺失）。
fn hostname() -> String {
    ["HOSTNAME", "COMPUTERNAME"]
        .iter()
        .find_map(|key| std::env::var(key).ok())
        .unwrap_or_default()
}

/// system_get_info：系统信息（老 `system-get-info`）。
#[tauri::command]
pub async fn system_get_info() -> AppResult<Envelope> {
    let cpus = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(0);

    Ok(response::success(json!({
        "platform": platform_name(),
        "arch": std::env::consts::ARCH,
        "hostname": hostname(),
        "cpus": cpus,
        "totalMemory": "",
        "freeMemory": "",
        "versions": { "node": "", "chrome": "", "electron": "" },
        "webview": tauri::webview_version().unwrap_or_default(),
    })))
}
