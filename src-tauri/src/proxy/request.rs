//! 转发实现：等价老项目 `electron/src/controller/request.ts` 的 `requestMake`
//! （并承接老 `electron/src/route/index.ts` 读取本地 configs 表的动作）。

use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;
use std::time::Duration;

use serde_json::{json, Map, Value};

use crate::config;
use crate::crypt;
use crate::db::{query, Database};
use crate::error::{AppError, AppResult};
use crate::js;
use crate::models;

use super::{now_secs, random_hex, Context, ProxyRequest, ProxyResponse, DEFAULT_TIMEOUT_SECS};

/// 老实现 `secretRow['app_url']` 对 `null` 取属性抛出的 TypeError 文案。
const JS_NULL_TYPE_ERROR: &str =
    "Cannot read properties of null (reading 'app_url')";
/// 老实现 `new URL()` 解析失败时的 TypeError 文案。
const JS_INVALID_URL_ERROR: &str = "Invalid URL";

/// 已完成解析的转发请求（DB 读取已在构造阶段完成，调用期间不持有数据库锁）。
pub struct PreparedRequest {
    method: reqwest::Method,
    url: String,
    headers: Vec<(String, String)>,
    body: Option<Value>,
    timeout: Duration,
    /// 网关密钥/IV（用于解密网关响应，等价老 `serverConfig.appSecret` / `appIv`）
    pub(crate) gateway_secret: String,
    pub(crate) gateway_iv: String,
}

/// 等价 `requestMake` 前半段。返回 `Err(response)` 表示已完成响应（老 `req.handleError`）。
pub fn prepare(
    db: &Database,
    request: &ProxyRequest,
    ctx: &mut Context,
) -> Result<PreparedRequest, ProxyResponse> {
    // 1) route/index.ts：`configsModel.getRow()` → `req.data`（随后被网关响应覆盖）
    let configs_row = db.with_conn(|conn| {
        let model = models::find("configs").map_err(AppError::other)?;
        query::get_row(conn, model, &Value::Object(Map::new()))
    });
    match configs_row {
        Ok(row) => ctx.set_data(row),
        Err(err) => return Err(ctx.handle_error(500, Some(err.to_string()))),
    }

    // 2) controller/request.ts：取 secrets 有效行（等价 `secretsHelper.getValid()`）
    let secret_row = db.with_conn(|conn| {
        let model = models::find("secrets").map_err(AppError::other)?;
        query::get_row(conn, model, &json!({ "status": 1 }))
    });
    let row = match secret_row {
        Ok(Value::Object(map)) => map,
        // 老实现：`secretRow` 为 null 时取属性抛 TypeError，被 catch 后 handleError(500, String(error))
        Ok(_) => return Err(ctx.handle_error(500, Some(JS_NULL_TYPE_ERROR.to_string()))),
        Err(err) => return Err(ctx.handle_error(500, Some(err.to_string()))),
    };

    // 3) 目标地址：等价 `new URL(secretRow.app_url || production.app_url)`
    let app_url = js_or(row.get("app_url"), config::production().app_url.as_str());
    let (protocol, host) = match split_origin(&app_url) {
        Some(parts) => parts,
        None => return Err(ctx.handle_error(500, Some(JS_INVALID_URL_ERROR.to_string()))),
    };
    let target_url = format!("{protocol}//{host}{}", request.path);

    // 4) 网关凭证：secrets 行优先，缺省回退环境变量注入的生产配置
    let app_id = js_or(row.get("app_id"), config::production().app_id.as_str());
    let app_secret = js_or(row.get("app_secret"), config::production().app_secret.as_str());
    let app_iv = js_or(row.get("app_iv"), config::production().app_iv.as_str());

    // 5) 请求头（保持 requestMake 的赋值顺序与算法）
    //    注：`host` / `content-length` 由 reqwest 依据实际 URL 与 body 生成，这里不手工设置
    let time_stamp = now_secs().to_string();
    let nonce = random_hex(16);
    let mut headers: HashMap<String, String> = request
        .headers
        .iter()
        .filter(|(key, _)| !is_hop_by_hop(key))
        .map(|(key, value)| (key.to_lowercase(), value.clone()))
        .collect();
    headers.insert("app-id".to_string(), app_id.clone());
    headers.insert("app-nonce".to_string(), nonce.clone());
    headers.insert(
        "app-secret".to_string(),
        format!(
            "{}{time_stamp}",
            crypt::md5(&format!(
                "{}{app_secret}",
                crypt::sha256(&format!("{app_id}{time_stamp}{nonce}"))
            ))
        ),
    );
    headers.insert("origin".to_string(), format!("{protocol}//{host}"));

    // 6) body 重加密：老加密体（本地密钥）→ 目标密钥加密体（iv 前缀约定）
    let body = reencrypt_body(
        &request.body,
        config::app_secret(),
        config::app_iv(),
        &app_secret,
    );

    // 7) x-sign：等价 gateway 侧 `VerifySignature`（sortObjectDeep + sha256 + md5）
    let mut sign_fields = Map::new();
    if let Some(Value::Object(params)) = &request.params {
        for (key, value) in params {
            sign_fields.insert(key.clone(), value.clone());
        }
    }
    if let Some(Value::Object(fields)) = &body {
        for (key, value) in fields {
            sign_fields.insert(key.clone(), value.clone());
        }
    }
    if !sign_fields.is_empty() {
        let sorted = sort_object_deep(&Value::Object(sign_fields));
        let serialized = serde_json::to_string(&sorted).unwrap_or_default();
        headers.insert(
            "x-sign".to_string(),
            crypt::md5(&format!("{}{app_secret}", crypt::sha256(&serialized))),
        );
    }

    let method = request
        .method
        .as_deref()
        .and_then(|value| reqwest::Method::from_bytes(value.to_uppercase().as_bytes()).ok())
        .unwrap_or(reqwest::Method::POST);

    Ok(PreparedRequest {
        method,
        url: target_url,
        headers: headers.into_iter().collect(),
        body,
        timeout: Duration::from_millis(parse_timeout(request.timeout)),
        gateway_secret: app_secret,
        gateway_iv: app_iv,
    })
}

/// 等价 `requestMake` 的 axios 转发（`validateStatus: () => true`，任何状态都当成功处理）。
pub async fn forward(prepared: &PreparedRequest) -> AppResult<(u16, HashMap<String, String>, Value)> {
    use reqwest::header::{HeaderName, HeaderValue, CONTENT_TYPE};

    let client = client()?;

    // 头去重后再上送：前端声明的 content-type 可能与最终体格式不一致（如 urlencoded 体重加密后为 JSON），
    // 若逐个 append 会出现两个 content-type，网关 body 解析会因此错位。
    let mut header_map = reqwest::header::HeaderMap::new();
    for (name, value) in &prepared.headers {
        let header_name = HeaderName::from_bytes(name.as_bytes());
        let header_value = HeaderValue::from_str(value);
        match (header_name, header_value) {
            (Ok(header_name), Ok(header_value)) => {
                header_map.insert(header_name, header_value);
            }
            _ => log::warn!("忽略非法请求头: {name}"),
        }
    }

    let body = match &prepared.body {
        // 原样上送的字符串体（非 JSON / urlencoded 场景）：沿用前端声明的 content-type
        Some(Value::String(text)) => text.clone().into_bytes(),
        Some(value) => {
            header_map.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
            serde_json::to_vec(value).map_err(|err| AppError::other(err.to_string()))?
        }
        None => Vec::new(),
    };

    let response = client
        .request(prepared.method.clone(), &prepared.url)
        .headers(header_map)
        .timeout(prepared.timeout)
        .body(body)
        .send()
        .await
        .map_err(|err| AppError::other(err.to_string()))?;

    let status = response.status().as_u16();
    let headers = collect_headers(response.headers());
    let text = response
        .text()
        .await
        .map_err(|err| AppError::other(err.to_string()))?;
    // 等价 axios 的 JSON 解析：非 JSON 响应回退为字符串（老实现会走 catch → handleError）
    let body = serde_json::from_str(&text).unwrap_or(Value::String(text));

    Ok((status, headers, body))
}

/// 等价 `requestMake` 后半段 + `middleware.response`：
/// 解网关响应 → 写入 `req.data` → 按状态码 `handleSuccess` / `handleError` → 包装信封。
pub fn finish(
    ctx: &mut Context,
    status: u16,
    headers: HashMap<String, String>,
    body: Value,
    gateway_secret: &str,
    gateway_iv: &str,
) -> ProxyResponse {
    // 等价 `responseData = response.data.data || response.data`
    let response_data = match &body {
        Value::Object(map) => match map.get("data") {
            Some(value) if !value.is_null() => value.clone(),
            _ => body.clone(),
        },
        _ => body.clone(),
    };

    let encrypted = match &response_data {
        Value::Object(map) => map
            .get("encryptedData")
            .filter(|value| js::js_truthy(value))
            .cloned(),
        _ => None,
    };

    match encrypted {
        Some(Value::String(cipher)) => {
            // 等价 `cryptTool.decrypt(responseData.encryptedData, serverConfig.appSecret, serverConfig.appIv)`
            let plain = crypt::decrypt_adaptive(&cipher, gateway_secret, gateway_iv)
                .unwrap_or(Value::Bool(false));
            ctx.set_data(plain);
        }
        // 非字符串密文：老实现解密抛错 → false
        Some(_) => ctx.set_data(Value::Bool(false)),
        None => {
            // 等价 `req.data = responseData || false`
            if js::js_truthy(&response_data) {
                ctx.set_data(response_data.clone());
            } else {
                ctx.set_data(Value::Bool(false));
            }
        }
    }

    let code = match &response_data {
        Value::Object(map) => map
            .get("code")
            .filter(|value| js::js_truthy(value))
            .and_then(number_code)
            .unwrap_or(status as u64),
        _ => status as u64,
    };

    let response = if status == 200 {
        ctx.handle_success()
    } else {
        let message = match &response_data {
            Value::Object(map) => map
                .get("message")
                .map(js::to_string)
                .filter(|text| !text.is_empty()),
            _ => None,
        };
        ctx.handle_error(code, message)
    };

    ProxyResponse {
        status: response.status,
        headers,
        body: response.body,
    }
}

/// 等价 `requestMake` 中的 body 重加密：
/// 老加密体用本地密钥（`config::app_secret()/app_iv()`）解密，再用目标密钥加密，
/// 最终形如 `{ encryptedData: iv(hex):密文(hex) }`；解密失败时与老实现一致地写入 `false`。
fn reencrypt_body(
    body: &Option<Value>,
    local_secret: &str,
    local_iv: &str,
    target_secret: &str,
) -> Option<Value> {
    let map = match body {
        Some(Value::Object(map)) => map,
        _ => return body.clone(),
    };

    let cipher = match map.get("encryptedData") {
        Some(Value::String(cipher)) if !cipher.is_empty() => cipher,
        _ => return body.clone(),
    };

    let plain = crypt::decrypt_adaptive(cipher, local_secret, local_iv).unwrap_or(Value::Bool(false));
    let encrypted = crypt::encrypt_iv_prefixed(&plain, target_secret)
        .map(Value::String)
        .unwrap_or(Value::Bool(false));

    Some(json!({ "encryptedData": encrypted }))
}

/// 等价 `lodash.sortObjectDeep`：递归按 key 排序（数组元素保持原序）。
fn sort_object_deep(value: &Value) -> Value {
    match value {
        Value::Object(map) => {
            let mut keys: Vec<&String> = map.keys().collect();
            keys.sort();
            let mut sorted = Map::new();
            for key in keys {
                sorted.insert(key.clone(), sort_object_deep(&map[key]));
            }
            Value::Object(sorted)
        }
        Value::Array(items) => Value::Array(items.iter().map(sort_object_deep).collect()),
        other => other.clone(),
    }
}

/// 等价 JS `value || fallback`（用于 app_url / app_id / app_secret / app_iv 回退）。
pub(crate) fn js_or(value: Option<&Value>, fallback: &str) -> String {
    match value {
        Some(value) if js::js_truthy(value) => js::to_string(value),
        _ => fallback.to_string(),
    }
}

/// 极简 URL 解析：仅取 `protocol` 与 `host`（等价 `new URL(x).protocol` / `.host`）。
pub(crate) fn split_origin(raw: &str) -> Option<(String, String)> {
    let (scheme, rest) = raw.split_once("://")?;
    if scheme.is_empty() {
        return None;
    }
    let host = rest
        .split(['/', '?', '#'])
        .next()
        .unwrap_or_default()
        .to_string();
    if host.is_empty() {
        return None;
    }
    Some((format!("{scheme}:"), host))
}

/// 等价 axios 会自动处理的头：不手工透传（reqwest 依据 URL/body 生成）。
fn is_hop_by_hop(name: &str) -> bool {
    matches!(
        name.to_lowercase().as_str(),
        "host" | "content-length" | "connection" | "accept-encoding"
    )
}

/// 响应头过滤：等价 axios（已解码 body 后不再带 length/encoding）。
fn is_dropped_response_header(name: &str) -> bool {
    matches!(
        name,
        "content-length" | "transfer-encoding" | "content-encoding" | "connection" | "keep-alive"
    )
}

fn collect_headers(headers: &reqwest::header::HeaderMap) -> HashMap<String, String> {
    let mut result: HashMap<String, String> = HashMap::new();
    for (name, value) in headers.iter() {
        let name = name.as_str().to_lowercase();
        if is_dropped_response_header(&name) {
            continue;
        }
        let value = value.to_str().unwrap_or_default().to_string();
        match result.get_mut(&name) {
            Some(existing) => {
                existing.push_str(", ");
                existing.push_str(&value);
            }
            None => {
                result.insert(name, value);
            }
        }
    }
    result
}

/// 等价 JS `responseData.code || response.status`（字符串数字同样可用）。
fn number_code(value: &Value) -> Option<u64> {
    match value {
        Value::Number(number) => number
            .as_u64()
            .or_else(|| number.as_f64().map(|value| value as u64)),
        Value::String(text) => text.trim().parse::<u64>().ok(),
        _ => None,
    }
}

/// 超时：默认 30s，取前端值但不超过 30s（见 docs/migration-plan.md M8）。
fn parse_timeout(requested: Option<u64>) -> u64 {
    let max = DEFAULT_TIMEOUT_SECS * 1000;
    match requested {
        Some(value) if value > 0 => value.min(max),
        _ => max,
    }
}

/// 进程级共享的 HTTP 客户端（等价老 axios 实例）。
pub(crate) fn client() -> AppResult<&'static reqwest::Client> {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    if let Some(client) = CLIENT.get() {
        return Ok(client);
    }

    ensure_tls_provider();
    let client = reqwest::Client::builder()
        .user_agent(format!("edtib-console/{}", env!("CARGO_PKG_VERSION")))
        .build()
        .map_err(|err| AppError::other(err.to_string()))?;
    Ok(CLIENT.get_or_init(|| client))
}

/// `rustls-no-provider` 需要进程级安装加密后端。
/// 与 `tauri-plugin-updater` 使用同一后端（ring），`install_default` 幂等；
/// 若上游已安装其它后端（如 aws-lc-rs），此处忽略错误并复用。
fn ensure_tls_provider() {
    static INSTALLED: OnceLock<()> = OnceLock::new();
    INSTALLED.get_or_init(|| {
        if rustls::crypto::ring::default_provider()
            .install_default()
            .is_err()
        {
            log::debug!("rustls 默认加密后端已由其它组件安装，复用现有后端");
        }
    });
}

/// 供诊断使用：转发涉及的头名白名单（避免误用未预期的头）。
#[allow(dead_code)]
pub fn forwarded_header_names(prepared: &PreparedRequest) -> HashSet<String> {
    prepared.headers.iter().map(|(name, _)| name.clone()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sort_object_deep_sorts_nested_keys() {
        let value = json!({"b": 1, "a": {"d": 2, "c": [3, 1]}});
        let sorted = sort_object_deep(&value);
        assert_eq!(serde_json::to_string(&sorted).unwrap(), r#"{"a":{"c":[3,1],"d":2},"b":1}"#);
    }

    #[test]
    fn split_origin_reads_protocol_and_host() {
        assert_eq!(
            split_origin("https://gateway-dev.edtib.com/api"),
            Some(("https:".to_string(), "gateway-dev.edtib.com".to_string()))
        );
        assert_eq!(
            split_origin("http://127.0.0.1:8080/x"),
            Some(("http:".to_string(), "127.0.0.1:8080".to_string()))
        );
        assert_eq!(split_origin("not-a-url"), None);
    }

    /// 测试专用合成密钥（真实凭证只来自环境变量）。
    const LOCAL_SECRET: &str = "0123456789abcdef0123456789abcdef";
    const LOCAL_IV: &str = "fedcba9876543210";
    const TARGET_SECRET: &str = "abcdef9876543210fedcba9876543210";

    #[test]
    fn reencrypt_body_keeps_plain_body() {
        let body = Some(json!({"page": 1}));
        assert_eq!(
            reencrypt_body(&body, LOCAL_SECRET, LOCAL_IV, TARGET_SECRET),
            body
        );
    }

    /// 前端 → 本地链路为「随机 IV + iv:密文」单层加密（见 `src/utils/request.ts` 的 `encrypt`）。
    #[test]
    fn reencrypt_body_switches_key() {
        let plain = json!({"id": 7});
        let cipher = crypt::encrypt_iv_prefixed(&plain, LOCAL_SECRET).expect("前端侧加密成功");
        let body = Some(json!({ "encryptedData": cipher }));

        let reencrypted = reencrypt_body(&body, LOCAL_SECRET, LOCAL_IV, TARGET_SECRET).expect("有 body");
        let forwarded = reencrypted
            .get("encryptedData")
            .and_then(Value::as_str)
            .expect("密文");
        assert_ne!(forwarded, cipher, "必须用网关密钥重新加密");
        assert_eq!(
            crypt::decrypt_adaptive(forwarded, TARGET_SECRET, LOCAL_IV),
            Some(plain)
        );
    }

    /// 老 electron 约定（固定 IV、无 iv 前缀）仍需可解，保证存量前端不被切断。
    #[test]
    fn reencrypt_body_accepts_legacy_fixed_iv() {
        let plain = json!({"id": 8});
        let cipher = crypt::encrypt(&plain, LOCAL_SECRET, LOCAL_IV);
        let body = Some(json!({ "encryptedData": cipher }));

        let reencrypted = reencrypt_body(&body, LOCAL_SECRET, LOCAL_IV, TARGET_SECRET).expect("有 body");
        let forwarded = reencrypted
            .get("encryptedData")
            .and_then(Value::as_str)
            .expect("密文");
        assert_eq!(
            crypt::decrypt_adaptive(forwarded, TARGET_SECRET, LOCAL_IV),
            Some(plain)
        );
    }

    /// 解不开时与老实现一致：以 `false` 作为明文重新加密上送，而不是把原始密文透传给网关。
    #[test]
    fn reencrypt_body_falls_back_to_false() {
        let body = Some(json!({ "encryptedData": "not-a-ciphertext" }));
        let reencrypted = reencrypt_body(&body, LOCAL_SECRET, LOCAL_IV, TARGET_SECRET).expect("有 body");
        let forwarded = reencrypted
            .get("encryptedData")
            .and_then(Value::as_str)
            .expect("密文");
        assert_eq!(
            crypt::decrypt_adaptive(forwarded, TARGET_SECRET, LOCAL_IV),
            Some(Value::Bool(false))
        );
    }
}
