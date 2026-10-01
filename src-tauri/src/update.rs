//! 应用更新（替代老 Electron 的 electron-updater）。
//!
//! 前端契约（`src/bridge/channels.ts` / `src/bridge/index.ts`）：
//!   * 命令：`get_app_version`、`check_update`、`confirm_update`、`restart_app`；
//!   * 事件：`updater:update-available` / `updater:update-not-available` /
//!     `updater:download-progress` / `updater:update-downloaded`。
//!
//! 流程与老实现对齐（老实现用 electron-updater 的 checkForUpdatesAndNotify + autoDownload）：
//!   check_update   → 命中新版本 emit update-available → 自动下载并 emit download-progress
//!                  → 下载完成 emit update-downloaded（包体暂存，等待 confirm_update）
//!                  → 无新版本 / 出错 emit update-not-available（前端据此收起 loading）
//!   confirm_update → 安装已下载的包体（tauri-plugin-updater 的 `Update::install`），
//!                  安装完成后由前端调用 restart_app 重启生效
//!
//! 清单端点与签名公钥来自 `tauri.conf.json` 的 `plugins.updater`，
//! 也可用 `EDTIB_UPDATER_ENDPOINT`（运行期或构建期）覆盖，见 [`resolve_endpoints`]。

use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};

use crate::error::{AppError, AppResult};

/// 事件名（与前端 BRIDGE_EVENTS 严格一致）。
pub const EVENT_UPDATE_AVAILABLE: &str = "updater:update-available";
pub const EVENT_UPDATE_NOT_AVAILABLE: &str = "updater:update-not-available";
pub const EVENT_DOWNLOAD_PROGRESS: &str = "updater:download-progress";
pub const EVENT_UPDATE_DOWNLOADED: &str = "updater:update-downloaded";

/// 构建期注入的版本别名 / 版本时间（对应老项目 package.json 的 versionAlias / versionTimer）。
const VERSION_ALIAS: Option<&str> = option_env!("EDTIB_VERSION_ALIAS");
const VERSION_TIMER: Option<&str> = option_env!("EDTIB_VERSION_TIMER");

/// 版本展示串：别名/时间齐备时沿用老格式 `{alias}-v{version}({timer})`，否则退回纯版本号。
pub fn app_version() -> String {
    let version = env!("CARGO_PKG_VERSION");
    match (VERSION_ALIAS, VERSION_TIMER) {
        (Some(alias), Some(timer)) => format!("{alias}-v{version}({timer})"),
        _ => version.to_string(),
    }
}

/// 已下载待安装的更新包。
struct Pending {
    update: Update,
    bytes: Vec<u8>,
}

/// 更新暂存状态（`check_update` 下载完成后填充，`confirm_update` 消费）。
#[derive(Default)]
pub struct PendingUpdate {
    inner: Mutex<Option<Pending>>,
}

impl PendingUpdate {
    fn store(&self, update: Update, bytes: Vec<u8>) {
        if let Ok(mut guard) = self.inner.lock() {
            *guard = Some(Pending { update, bytes });
        }
    }

    fn take(&self) -> AppResult<Option<Pending>> {
        self.inner
            .lock()
            .map(|mut guard| guard.take())
            .map_err(|_| AppError::other("更新状态锁获取失败"))
    }
}

/// 更新信息（下发给前端的事件载荷，字段与 `src/bridge/types.ts#UpdateInfo` 对齐）。
#[derive(Debug, Clone)]
struct UpdateInfo {
    version: String,
    current_version: String,
    date: Option<String>,
    body: Option<String>,
    target: String,
}

impl UpdateInfo {
    fn from_update(update: &Update) -> Self {
        Self {
            version: update.version.clone(),
            current_version: update.current_version.clone(),
            date: update.date.map(|date| date.to_string()),
            body: update.body.clone(),
            target: update.target.clone(),
        }
    }

    fn to_json(&self) -> Value {
        json!({
            "version": self.version,
            "currentVersion": self.current_version,
            "date": self.date,
            "releaseNotes": self.body,
            "target": self.target,
        })
    }
}

/// 更新服务端点解析（优先级：运行期环境变量 > 构建期环境变量 > tauri.conf.json plugins.updater.endpoints）。
///
/// 注意：Tauri 更新器需要 `latest.json` 清单（含 `platforms.<target>.url/signature`），
/// 与老 electron-updater 的 `latest.yml` 不是同一份文件，发布端需另行部署。
pub fn resolve_endpoints(app: &AppHandle) -> Vec<String> {
    let mut endpoints: Vec<String> = Vec::new();

    let mut push_all = |raw: &str| {
        for item in raw.split([',', ';', '\n']) {
            let item = item.trim();
            if !item.is_empty() && !endpoints.iter().any(|existing| existing == item) {
                endpoints.push(item.to_string());
            }
        }
    };

    if let Ok(value) = std::env::var("EDTIB_UPDATER_ENDPOINT") {
        push_all(&value);
    }
    if let Some(value) = option_env!("EDTIB_UPDATER_ENDPOINT") {
        push_all(value);
    }

    if let Some(Value::Object(updater)) = app.config().plugins.0.get("updater") {
        if let Some(Value::Array(list)) = updater.get("endpoints") {
            for item in list {
                if let Some(text) = item.as_str() {
                    push_all(text);
                }
            }
        }
    }

    endpoints
}

/// 检查失败时同样要下发 update-not-available：前端 UI 依赖它收起 loading 状态。
fn emit_not_available(app: &AppHandle, payload: Value) {
    let _ = app.emit(EVENT_UPDATE_NOT_AVAILABLE, payload);
}

/// `check_update`：检查更新 → 下载 → 上报进度 → 暂存待安装包体。
pub async fn check_for_updates(app: &AppHandle) -> AppResult<Value> {
    let endpoints = resolve_endpoints(app);
    if endpoints.is_empty() {
        let message = "更新服务地址未配置（EDTIB_UPDATER_ENDPOINT 或 tauri.conf.json plugins.updater.endpoints）";
        emit_not_available(app, json!({ "available": false, "message": message }));
        return Err(AppError::other(message));
    }

    let urls = endpoints
        .iter()
        .map(|endpoint| {
            tauri::Url::parse(endpoint)
                .map_err(|err| AppError::other(format!("更新地址非法 {endpoint}：{err}")))
        })
        .collect::<AppResult<Vec<_>>>()?;

    let updater = app
        .updater_builder()
        .endpoints(urls)
        .map_err(updater_error)?
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(updater_error)?;

    let found = match updater.check().await {
        Ok(found) => found,
        Err(err) => {
            let message = format!("检查更新失败：{err}");
            emit_not_available(app, json!({ "available": false, "message": message }));
            return Err(AppError::other(message));
        }
    };

    let Some(update) = found else {
        // 已是最新版本（含端点返回 204 的情况）
        emit_not_available(app, json!({ "available": false, "currentVersion": app_version() }));
        return Ok(json!({ "available": false, "currentVersion": app_version() }));
    };

    let info = UpdateInfo::from_update(&update);
    let _ = app.emit(EVENT_UPDATE_AVAILABLE, info.to_json());

    // 自动下载（对齐老实现的 autoDownload + 进度上报）
    let last_emit = Mutex::new((Instant::now(), -1.0f64));
    let app_for_progress = app.clone();
    let downloaded = update
        .download(
            move |chunk: usize, total: Option<u64>| {
                let total = total.unwrap_or(0);
                let percent = if total > 0 {
                    (chunk as f64 / total as f64) * 100.0
                } else {
                    0.0
                };
                if let Ok(mut guard) = last_emit.lock() {
                    let (last_time, last_percent) = *guard;
                    let rounded = (percent * 10.0).round() / 10.0;
                    // 限流：进度变化 < 0.5% 且不足 200ms 时不上报，避免事件风暴
                    if rounded == last_percent
                        || (last_time.elapsed() < Duration::from_millis(200)
                            && (rounded - last_percent).abs() < 0.5)
                    {
                        return;
                    }
                    *guard = (Instant::now(), rounded);
                    let _ = app_for_progress.emit(
                        EVENT_DOWNLOAD_PROGRESS,
                        json!({
                            "percent": rounded,
                            "transferred": chunk,
                            "total": if total > 0 { Value::from(total) } else { Value::Null },
                        }),
                    );
                }
            },
            || {},
        )
        .await
        .map_err(|err| {
            let message = format!("更新包下载失败：{err}");
            emit_not_available(app, json!({ "available": false, "message": message }));
            AppError::other(message)
        })?;

    let size = downloaded.len();
    app.state::<PendingUpdate>().store(update, downloaded);

    let mut payload = info.to_json();
    if let Some(object) = payload.as_object_mut() {
        object.insert("size".to_string(), Value::from(size as u64));
    }
    let _ = app.emit(EVENT_UPDATE_DOWNLOADED, payload.clone());

    Ok(json!({ "available": true, "update": info.to_json(), "size": size }))
}

/// `confirm_update`：安装已下载的更新包。
pub fn confirm_update(app: &AppHandle) -> AppResult<Value> {
    let Some(pending) = app.state::<PendingUpdate>().take()? else {
        return Err(AppError::other(
            "没有已下载的更新包，请先执行 check_update",
        ));
    };
    // 安装必须由待安装的那个 `Update` 实例执行（`Update::install`）：
    // 重新 build 出来的 `Updater` 只有 check 能力，没有 install 方法。
    // `pending` 是 `take()` 得到的拥有所有权的值，对 `update` 借用、对 `bytes` 移动，
    // 二者是结构体的不同字段，借用与部分移动互不冲突。
    let Pending { update, bytes } = pending;
    let version = update.version.clone();
    update
        .install(bytes)
        .map_err(|err| AppError::other(format!("更新安装失败：{err}")))?;
    Ok(json!({ "installed": true, "version": version }))
}

/// `restart_app`：重启当前应用（老实现 `app.relaunch()` + `app.exit(0)` 的等价物）。
pub fn restart_app(app: &AppHandle) -> ! {
    app.restart()
}

fn updater_error(err: tauri_plugin_updater::Error) -> AppError {
    AppError::other(format!("更新器初始化失败：{err}"))
}

#[cfg(test)]
mod tests {
    use super::app_version;

    #[test]
    fn app_version_always_contains_package_version() {
        // 未注入 EDTIB_VERSION_ALIAS / EDTIB_VERSION_TIMER 时退回纯版本号，
        // 注入后为 `{alias}-v{version}({timer})`；两种形态都必须包含版本号，
        // 前端「当前版本」展示依赖它。
        assert!(app_version().contains(env!("CARGO_PKG_VERSION")));
    }
}
