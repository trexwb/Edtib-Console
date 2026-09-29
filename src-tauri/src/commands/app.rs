//! 应用信息域命令（骨架自检 / 「关于」面板）。

use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::error::AppResult;

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
