//! 应用信息 / 版本更新域命令（对应 `src/bridge/channels.ts` 的 `app.*`，骨架自检与「关于」面板共用）。
//!
//! * `get_app_version`：版本展示串（老 `{versionAlias}-v{version}({versionTimer})` 格式，见 [`crate::update`]）；
//! * `check_update` / `confirm_update` / `restart_app`：基于 `tauri-plugin-updater`，
//!   检查结果与下载进度通过 4 个更新事件下发（见 [`crate::update`] 与 `BRIDGE_EVENTS`）。

use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Manager};

use crate::error::AppResult;
use crate::response::{self, Envelope};
use crate::update;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    /// 产品名（productName）
    pub name: String,
    /// 版本号
    pub version: String,
    /// bundle identifier
    pub identifier: String,
    /// 目标操作系统
    pub os: String,
    /// 目标架构
    pub arch: String,
    /// 构建类型：debug / release
    pub profile: &'static str,
    /// 本地数据目录（AppData）
    pub data_dir: String,
}

/// 返回应用基础信息，用于前端启动自检与「关于」面板。
#[tauri::command]
pub fn app_info(app: AppHandle) -> AppResult<AppInfo> {
    let package = app.package_info();
    let data_dir = app.path().app_data_dir()?;

    Ok(AppInfo {
        name: package.name.clone(),
        version: package.version.to_string(),
        identifier: app.config().identifier.clone(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        profile: if cfg!(debug_assertions) {
            "debug"
        } else {
            "release"
        },
        data_dir: data_dir.display().to_string(),
    })
}

/// get_app_version：应用版本展示串（老 `get-app-version`）。
#[tauri::command]
pub async fn get_app_version() -> AppResult<String> {
    Ok(update::app_version())
}

/// check_update：检查更新并下发更新事件（老 `check-update`）。
#[tauri::command]
pub async fn check_update(app: AppHandle) -> AppResult<Envelope> {
    let data = update::check_for_updates(&app).await?;
    Ok(response::success(data))
}

/// confirm_update：安装已下载的更新包（老实现由 electron-updater 的 quitAndInstall 承担）。
#[tauri::command]
pub async fn confirm_update(app: AppHandle) -> AppResult<Envelope> {
    let data = update::confirm_update(&app)?;
    Ok(response::success(data))
}

/// restart_app：重启应用（老 `restart-app`，该调用不返回）。
#[tauri::command]
pub async fn restart_app(app: AppHandle) -> AppResult<Value> {
    update::restart_app(&app)
}
