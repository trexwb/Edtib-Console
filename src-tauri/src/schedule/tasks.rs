//! 定时任务业务体：等价老项目 `electron/src/schedule/components/*`
//! （`heartbeatTask.ts` / `updateTask.ts` / `downCrtFileTask.ts`）。
//!
//! 老项目三个组件各自独立导出 `default async function`，由 `schedule/index.ts`
//! 依据 `schedules.handler.require` 动态 `import` 后调用。新实现改为本地白名单分发
//! （`run`），语义一致但不存在远程加载任意模块的入口。

use std::path::PathBuf;
use std::time::Duration;

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_updater::UpdaterExt;

use crate::db::query;
use crate::error::AppError;
use crate::js;
use crate::models;
use crate::proxy::request;
use crate::state::AppState;
use crate::proxy;

/// 「有新版本」广播事件（对应老 electron-updater 的 update-available 通知）。
pub const EVENT_UPDATE_AVAILABLE: &str = "schedule://update-available";

/// 已迁移的任务白名单（等价 `handler.require` 的取值域）。
pub const SUPPORTED_TASKS: [&str; 3] = ["heartbeatTask", "updateTask", "downCrtFileTask"];

/// 老 `downCrtFileTask.ts` 中的远端证书地址。
const CERT_URL: &str = "https://static.edtib.com/update/cert/localhost-crt.txt";
const KEY_URL: &str = "https://static.edtib.com/update/cert/localhost-key.txt";

/// 老 `heartbeatTask.ts` 的兜底网关地址（`app_url` 缺失时使用）。
const FALLBACK_APP_URL: &str = "https://gateway.edtib.com";

/// 执行单个任务（等价老 `import('../schedule/components/<require>.js')` 后调用 `default`）。
pub async fn run(app: &AppHandle, require: &str) -> Result<Value, String> {
    match require {
        "heartbeatTask" => heartbeat(app).await,
        "updateTask" => check_update(app).await,
        "downCrtFileTask" => download_certificate(app).await,
        other => Err(format!("未迁移的任务：{other}")),
    }
}

/// 等价老 `heartbeatTask`：`GET {app_url 的 scheme//host}/heartbeat`。
///
/// 老实现用 `try/catch` 吞掉全部异常并返回 `true`（心跳失败不阻塞调度），
/// 这里保持同样口径：网络失败只记日志，返回结构化结果供观测。
pub async fn heartbeat(app: &AppHandle) -> Result<Value, String> {
    let app_url = secret_field(app, "app_url").unwrap_or_else(|| FALLBACK_APP_URL.to_string());
    let (protocol, host) =
        request::split_origin(&app_url).ok_or_else(|| format!("Invalid URL: {app_url}"))?;
    let target_url = format!("{protocol}//{host}/heartbeat");

    let client = request::client().map_err(|err| err.to_string())?;
    match client
        .get(&target_url)
        .timeout(Duration::from_secs(proxy::DEFAULT_TIMEOUT_SECS))
        .send()
        .await
    {
        Ok(response) => Ok(json!({
            "url": target_url,
            "status": response.status().as_u16(),
        })),
        Err(err) => {
            log::warn!("心跳上报失败（老实现同样忽略该错误）: {err}");
            Ok(json!({ "url": target_url, "status": 0 }))
        }
    }
}

/// 等价老 `updateTask`：`autoUpdater.checkForUpdatesAndNotify()`。
///
/// Tauri 侧对应 `tauri-plugin-updater` 的 `check()`；发现新版本时广播
/// [`EVENT_UPDATE_AVAILABLE`]，由前端决定是否下载/安装（老 electron-updater 同样是
/// 「检查 + 通知」而非静默安装）。异常只记日志，保持返回 `true` 的老行为。
pub async fn check_update(app: &AppHandle) -> Result<Value, String> {
    let updater = app
        .updater()
        .map_err(|err| format!("初始化更新器失败: {err}"))?;

    match updater.check().await {
        Ok(Some(update)) => {
            let version = update.version.clone();
            let payload = json!({
                "currentVersion": update.current_version,
                "version": version,
                "body": update.body,
                "date": update.date.map(|date| date.to_string()),
            });
            if let Err(err) = app.emit(EVENT_UPDATE_AVAILABLE, payload) {
                log::warn!("广播更新事件失败: {err}");
            }
            log::info!("检查更新：发现新版本 {version}");
            Ok(json!({ "available": true, "version": version }))
        }
        Ok(None) => {
            log::info!("检查更新：当前已是最新版本");
            Ok(json!({ "available": false }))
        }
        Err(err) => {
            // 老实现 catch 后仅 console.log，任务本身仍视为成功
            log::warn!("检查更新失败（老实现同样忽略该错误）: {err}");
            Ok(json!({ "available": false, "error": err.to_string() }))
        }
    }
}

/// 等价老 `downCrtFileTask`：下载 cert/key 文本，内容有变化才写入本地证书目录。
///
/// 差异说明：老实现写入 `<electron 工程根>/certs/`，新项目落
/// `<AppData>/certs/`（Tauri 资源目录只读，见 docs/migration-plan.md M6）。
pub async fn download_certificate(app: &AppHandle) -> Result<Value, String> {
    let directory = certificate_dir(app)?;
    let client = request::client().map_err(|err| err.to_string())?;

    let cert_updated = sync_file(&client, CERT_URL, &directory.join("fullchain.crt")).await?;
    let key_updated = sync_file(&client, KEY_URL, &directory.join("privkey.key")).await?;

    if cert_updated || key_updated {
        log::info!("证书已更新，建议重启相关服务以加载新证书");
    } else {
        log::info!("所有证书已是最新版本，无需更新");
    }

    Ok(json!({
        "directory": directory.display().to_string(),
        "certUpdated": cert_updated,
        "keyUpdated": key_updated,
    }))
}

/// 证书落盘目录（AppData 子目录，等价老 `path.resolve(__dirname, '../../../', 'certs')`）。
fn certificate_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|err| err.to_string())?
        .join("certs");
    std::fs::create_dir_all(&dir).map_err(|err| format!("创建证书目录失败: {err}"))?;
    Ok(dir)
}

/// 下载单个证书文件：空内容跳过、内容未变化跳过（等价老 `downloadAndMaybeWriteFile`）。
async fn sync_file(
    client: &reqwest::Client,
    url: &str,
    target: &PathBuf,
) -> Result<bool, String> {
    let response = client
        .get(url)
        .timeout(Duration::from_secs(proxy::DEFAULT_TIMEOUT_SECS))
        .send()
        .await
        .map_err(|err| format!("网络请求失败: {err}"))?;

    if response.status().as_u16() != 200 {
        return Err(format!("请求失败，状态码: {}", response.status().as_u16()));
    }

    let content = response
        .text()
        .await
        .map_err(|err| format!("读取响应失败: {err}"))?;

    if content.trim().is_empty() {
        log::warn!("远程内容为空，跳过写入: {}", target.display());
        return Ok(false);
    }

    match std::fs::read_to_string(target) {
        Ok(existing) if existing.trim() == content.trim() => {
            log::info!("内容未变化，无需写入: {}", target.display());
            return Ok(false);
        }
        Ok(_) => {}
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {}
        Err(err) => return Err(format!("操作失败: {err}")),
    }

    std::fs::write(target, &content).map_err(|err| format!("操作失败: {err}"))?;
    log::info!("已更新文件: {}", target.display());
    Ok(true)
}

/// 读取 `secrets` 表中启用行的指定字段（等价老 `secretsHelper.getValid()`）。
///
/// 走模型层读取，保证 `app_secret` / `app_iv` 的 Cast::Crypt 解密口径与老实现一致。
fn secret_field(app: &AppHandle, field: &str) -> Option<String> {
    let state = app.state::<AppState>();
    let row = state
        .db
        .with_conn(|conn| {
            let model = models::find("secrets").map_err(AppError::other)?;
            query::get_row(conn, model, &json!({ "status": 1 }))
        })
        .ok()?;

    match row.as_object()?.get(field) {
        Some(Value::String(text)) if !text.is_empty() => Some(text.clone()),
        Some(Value::Null) | None => None,
        Some(other) => Some(js::to_string(other)),
    }
}
