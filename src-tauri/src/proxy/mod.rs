//! 转发代理层：等价老项目 Electron 本地服务的请求链路。
//!
//! 老链路（`electron/src/index.ts` + `route/*` + `controller/request.ts`）：
//!
//! ```text
//! 渲染层 axios → https://localhost.edtib.com:64580/api/*（自签证书）
//!   → middleware.factory     初始化 req/res 响应句柄
//!   → middleware.token       校验 App-Id / App-Nonce / App-Secret
//!                            （nonce 正则 + 1800s 过期 + md5(sha256(appId+ts+nonce)+appSecret)+ts）
//!   → route/index.ts         读取本地 configs 表首行
//!   → controller.requestMake 取 secrets 有效行 → 解密 body → 目标密钥重加密
//!                            → 计算 x-sign → 转发 gateway → 解密响应
//!   → middleware.response    包装 { code, message, timestamp, encryptedData? } 信封
//! ```
//!
//! 新链路：渲染层 axios（Tauri adapter）→ `invoke('proxy_request')` → 本模块（同样五步）
//! → `reqwest` 转发 gateway。无本地端口、无自签证书、无 Node HTTP 服务。
//!
//! 加解密口径（与老实现一致，见 docs/migration-coverage.md）：
//! - 本地 ↔ 前端：aes-256-cbc + 固定 IV（老 electron `cryptTool` 约定）
//! - 本地 ↔ 网关：随机 IV + `iv(hex):密文(hex)`（web 前端约定）

pub mod middleware;
pub mod request;

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// 等价老项目 `process.env.TOKEN_TIME || 1800`（单位：秒）。
pub const TOKEN_TTL_SECS: u64 = 1800;
/// 转发超时上限：30s（对齐老 Express 侧请求超时，见 docs/migration-plan.md M8）。
pub const DEFAULT_TIMEOUT_SECS: u64 = 30;

/// 等价老 `Math.floor(Date.now() / 1000)`。
pub fn now_secs() -> i64 {
    chrono::Utc::now().timestamp()
}

/// 等价老 `crypto.randomUUID().replace(/-/g, '').slice(0, 32)`（生成请求 nonce）。
pub fn random_hex(bytes: usize) -> String {
    let mut buffer = vec![0u8; bytes];
    match getrandom::getrandom(&mut buffer) {
        Ok(()) => hex::encode(buffer),
        Err(err) => {
            log::warn!("随机数生成失败，退回时间戳 nonce: {err}");
            format!("{:032x}", now_secs())
        }
    }
}

/// 前端传来的请求描述：等价 Express 请求中的 `originalUrl / method / headers / query / body`。
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyRequest {
    /// 等价 `req.originalUrl`（含 query，由前端 adapter 拼接，如 `/api/console/common/configs`）
    pub path: String,
    /// 等价 `req.method`
    pub method: Option<String>,
    /// 等价 `req.headers`
    #[serde(default)]
    pub headers: HashMap<String, String>,
    /// 等价 `req.query`（已并入 `path`，此处仅参与 x-sign 计算）
    pub params: Option<Value>,
    /// 等价 `req.body`
    pub body: Option<Value>,
    /// 前端 axios 超时（毫秒）；缺省 30s，上限 30s
    pub timeout: Option<u64>,
}

/// 响应信封：等价老 `middleware.ts` 中 `buildResponse()` 的 `{ code, message, timestamp }`
/// 以及随后的 `encryptedData` / `data` 赋值。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyEnvelope {
    /// 业务码（等价老 `req.code || 200`）
    pub code: u64,
    /// 消息（等价老 `req.msg || 'success'`）
    pub message: String,
    /// 等价老 `new Date().toISOString()`
    pub timestamp: String,
    /// 密文（等价老 `result.encryptedData`；前端按 `VITE_RETURN_ENCRYPT` 解密）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub encrypted_data: Option<Value>,
    /// 明文数据（等价老 `result.data`：无密钥或加密失败时的兜底）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

/// 一次代理调用的结果：HTTP 状态 + 网关响应头 + 信封 body。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyResponse {
    /// 等价老 `res.status(dictionary(req.code))`（取业务码前 3 位）
    pub status: u16,
    /// 等价老 `res.set(response.headers)`（供前端读取 `auth-token` 等）
    pub headers: HashMap<String, String>,
    /// 信封 body（等价老 `res.send(buildResponse(req.data))`）
    pub body: ProxyEnvelope,
}

/// 等价老 middleware 挂在 `req` / `res` 上的可变状态。
pub struct Context {
    /// 等价 `req.code`
    code: Option<u64>,
    /// 等价 `req.msg`
    msg: Option<String>,
    /// 等价 `req.data`
    data: Option<Value>,
    /// 等价 `res.isResponse`
    responded: bool,
    /// 等价老 `if (res.isResponse()) return res`（同一响应只构建一次）
    cached: Option<ProxyResponse>,
}

impl Context {
    /// 等价 `middleware.factory`：初始化请求/响应句柄。
    pub fn factory() -> Self {
        Self {
            code: None,
            msg: None,
            data: None,
            responded: false,
            cached: None,
        }
    }

    /// 等价 `req.data = data`。
    pub fn set_data(&mut self, data: Value) {
        self.data = Some(data);
    }

    /// 等价只读的 `req.data`。
    pub fn data(&self) -> Option<&Value> {
        self.data.as_ref()
    }

    /// 若已响应则复用同一响应（等价 `res.isResponse()` 短路）。
    fn build(&mut self) -> ProxyResponse {
        if let Some(response) = &self.cached {
            return response.clone();
        }

        let response = middleware::respond(self);
        self.responded = true;
        self.cached = Some(response.clone());
        response
    }

    /// 等价 `req.handleError(code, error)`：`code || 500`、`error ? String(error) : null`。
    pub fn handle_error(&mut self, code: u64, error: Option<String>) -> ProxyResponse {
        self.code = Some(if code == 0 { 500 } else { code });
        self.msg = error.filter(|message| !message.is_empty());
        self.build()
    }

    /// 等价 `req.handleSuccess()`：写入 200 并保持已有 `req.data`（`data || req.data`）。
    pub fn handle_success(&mut self) -> ProxyResponse {
        self.code = Some(200);
        self.build()
    }

    /// 业务码（供内部诊断/日志使用）。
    pub fn code(&self) -> u64 {
        self.code.unwrap_or(200)
    }
}

/// 完整的代理调用：等价「middleware.factory → token → route → requestMake → response」。
pub async fn handle(app: tauri::AppHandle, request: ProxyRequest) -> ProxyResponse {
    use tauri::Manager;

    let mut ctx = Context::factory();

    // 1) middleware.token：鉴权未通过时直接返回错误信封
    if let Some(response) = middleware::token(&mut ctx, &request.headers) {
        return response;
    }

    // 2) route/index.ts + controller/request.ts 前半段（DB 读取，同步且不跨 await 持锁）
    let prepared = {
        let state = app.state::<crate::state::AppState>();
        request::prepare(&state.db, &request, &mut ctx)
    };
    let prepared = match prepared {
        Ok(prepared) => prepared,
        Err(response) => return response,
    };

    // 3) 转发网关（等价 axios 调用）
    let (status, headers, body) = match request::forward(&prepared).await {
        Ok(parts) => parts,
        Err(err) => {
            log::error!("转发网关失败: {err}");
            return ctx.handle_error(500, Some(err.to_string()));
        }
    };

    // 4) 解密网关响应 + 包装信封（等价 requestMake 后半段 + middleware.response）
    request::finish(
        &mut ctx,
        status,
        headers,
        body,
        &prepared.gateway_secret,
        &prepared.gateway_iv,
    )
}
