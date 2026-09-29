//! 转发代理域命令：等价老项目 Electron 本地服务的 `POST /api/*` 单入口。
//!
//! 迁移前后对照：
//! - 老：渲染层 axios → `https://localhost.edtib.com:64580/api/*`（Express + 自签证书 + middleware 链）
//! - 新：渲染层 axios（Tauri adapter）→ `invoke('proxy_request', { request })` → Rust 代理层
//!
//! 命令只做「入口 + 出参转换」，鉴权/加解密/转发口径全部收敛在 [`crate::proxy`]。

use serde_json::Value;
use tauri::AppHandle;

use crate::error::{AppError, AppResult};
use crate::proxy::{self, ProxyRequest};

/// 等价老 `route/index.ts` 的 `router.post('/')`：单一入口，按路径转发到网关。
///
/// 返回 `{ status, headers, body }`：
/// - `status`  等价老 `res.status(dictionary(req.code))`
/// - `headers` 等价老 `res.set(response.headers)`
/// - `body`    等价老 `res.send(buildResponse(req.data))` 信封
///
/// 链路内的任何异常都会按老 Express 的 catch 行为包装为错误信封
/// （`handleError(500, String(error))`），因此本命令仅在信封序列化失败时返回 `Err`。
#[tauri::command]
pub async fn proxy_request(app: AppHandle, request: ProxyRequest) -> AppResult<Value> {
    let response = proxy::handle(app, request).await;
    serde_json::to_value(&response).map_err(|err| AppError::other(err.to_string()))
}
