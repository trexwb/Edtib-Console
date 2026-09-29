//! 等价老项目 `electron/src/route/middleware.ts`：
//! `factory`（初始化请求/响应句柄）、`token`（鉴权）、`response`（统一信封）。

use std::collections::HashMap;

use serde_json::Value;

use crate::config;
use crate::crypt;
use crate::js;

use super::{now_secs, Context, ProxyEnvelope, ProxyResponse, TOKEN_TTL_SECS};

/// 等价 `middleware.token`：全部校验通过返回 `None`，否则返回已构建的错误响应。
///
/// 校验顺序与错误码与老实现完全一致：
/// 4016000301（appId/appSecret 为空）→ 4016000306（nonce 非法）
/// → 4016000302（过期）→ 4016000303（appId 不匹配）→ 4016000305（签名不匹配）。
pub fn token(ctx: &mut Context, headers: &HashMap<String, String>) -> Option<ProxyResponse> {
    let app_id = header(headers, "app-id");
    let app_secret = header(headers, "app-secret");
    let nonce = header(headers, "app-nonce");

    // 等价 `String(appSecret).substring(32) || 0`：时间戳拼接在签名末尾
    let time_stamp = app_secret.chars().skip(32).collect::<String>();
    let time_stamp_value: i64 = if time_stamp.is_empty() {
        0
    } else {
        time_stamp.parse().unwrap_or(0)
    };

    if app_id.is_empty() || app_secret.is_empty() {
        return Some(ctx.handle_error(
            4016000301,
            Some("appId/appSecret is empty".to_string()),
        ));
    }

    // 等价 `/^[a-zA-Z0-9]{8,64}$/.test(nonce)`
    if nonce.is_empty() || !is_valid_nonce(&nonce) {
        return Some(ctx.handle_error(
            4016000306,
            Some("app-nonce is missing or invalid".to_string()),
        ));
    }

    // 等价 `timeStamp < Math.floor(Date.now() / 1000) - TOKEN_TIME`
    if time_stamp_value < now_secs() - TOKEN_TTL_SECS as i64 {
        return Some(ctx.handle_error(4016000302, Some("appSecret expiration".to_string())));
    }

    if config::APP_ID != app_id {
        return Some(ctx.handle_error(
            4016000303,
            Some("appId/appSecret error".to_string()),
        ));
    }

    // 等价 `md5(sha256(appId + timeStamp + nonce) + appSecret) + timeStamp`
    let expected = format!(
        "{}{}",
        crypt::md5(&format!(
            "{}{}",
            crypt::sha256(&format!("{app_id}{time_stamp}{nonce}")),
            config::APP_SECRET
        )),
        time_stamp
    );
    if app_secret != expected {
        return Some(ctx.handle_error(
            4016000305,
            Some(format!(
                "{app_id}|{}appSecret verification failed",
                crypt::md5(&app_secret)
            )),
        ));
    }

    None
}

/// 等价 `middleware.response`：先 `buildResponse()` 再按需写入 `encryptedData` / `data`。
pub fn respond(ctx: &Context) -> ProxyResponse {
    let code = ctx.code();
    let mut envelope = ProxyEnvelope {
        code: if code == 0 { 200 } else { code },
        message: ctx.msg.clone().unwrap_or_else(|| "success".to_string()),
        timestamp: js::now_iso(),
        encrypted_data: None,
        data: None,
    };

    if let Some(value) = ctx.data.clone() {
        // 等价 `if (responseData && responseData !== null && responseData !== undefined)`
        if js::js_truthy(&value) {
            match &value {
                // 等价 `if (typeof responseData === 'object' && 'encryptedData' in responseData)`
                Value::Object(map) if map.contains_key("encryptedData") => {
                    // 等价 `result.encryptedData = responseData.encryptedData`（原样透传）
                    envelope.encrypted_data = map.get("encryptedData").cloned();
                }
                _ => encrypt_data(&mut envelope, &value),
            }
        }
    }

    ProxyResponse {
        status: dictionary(code),
        headers: HashMap::new(),
        body: envelope,
    }
}

/// 等价老实现：`cryptTool.encrypt(responseData, serverConfig.appSecret, serverConfig.appIv)`
/// → 成功写 `result.encryptedData`；无密钥或失败写 `result.data`（明文兜底）。
fn encrypt_data(envelope: &mut ProxyEnvelope, value: &Value) {
    let key = config::APP_SECRET;
    let iv = config::APP_IV;

    if !key.is_empty() && !iv.is_empty() {
        if let Some(encrypted) = crypt::encrypt_iv_prefixed(value, key) {
            envelope.encrypted_data = Some(Value::String(encrypted));
            return;
        }
    }

    envelope.data = Some(value.clone());
}

/// 等价老 `dictionary(code)`：`Number(String(code || 200).substring(0, 3)) || 200`。
pub fn dictionary(code: u64) -> u16 {
    let code = if code == 0 { 200 } else { code };
    let head: String = code.to_string().chars().take(3).collect();
    head.parse::<u16>().unwrap_or(200)
}

/// 等价 `/^[a-zA-Z0-9]{8,64}$/`。
fn is_valid_nonce(nonce: &str) -> bool {
    let length = nonce.chars().count();
    (8..=64).contains(&length) && nonce.chars().all(|c| c.is_ascii_alphanumeric())
}

/// 大小写不敏感地取请求头（Express 会把请求头名规范为小写）。
fn header(headers: &HashMap<String, String>, name: &str) -> String {
    headers
        .iter()
        .find(|(key, _)| key.eq_ignore_ascii_case(name))
        .map(|(_, value)| value.trim().to_string())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn signed_headers(app_id: &str, app_secret: &str, nonce: &str) -> HashMap<String, String> {
        let time_stamp = now_secs().to_string();
        let signature = format!(
            "{}{}",
            crypt::md5(&format!(
                "{}{}",
                crypt::sha256(&format!("{app_id}{time_stamp}{nonce}")),
                config::APP_SECRET
            )),
            time_stamp
        );
        HashMap::from([
            ("app-id".to_string(), app_id.to_string()),
            ("app-nonce".to_string(), nonce.to_string()),
            ("app-secret".to_string(), format!("{signature}{time_stamp}")),
        ])
    }

    #[test]
    fn token_accepts_valid_signature() {
        let mut ctx = Context::factory();
        let headers = signed_headers(config::APP_ID, config::APP_SECRET, "abcdefgh12345678");
        assert!(token(&mut ctx, &headers).is_none());
    }

    #[test]
    fn token_rejects_wrong_app_id() {
        let mut ctx = Context::factory();
        let headers = signed_headers("1234567890123456", config::APP_SECRET, "abcdefgh12345678");
        let response = token(&mut ctx, &headers).expect("应拒绝");
        assert_eq!(response.body.code, 4016000303);
    }

    #[test]
    fn token_rejects_bad_nonce() {
        let mut ctx = Context::factory();
        let headers = signed_headers(config::APP_ID, config::APP_SECRET, "短");
        let response = token(&mut ctx, &headers).expect("应拒绝");
        assert_eq!(response.body.code, 4016000306);
    }

    #[test]
    fn dictionary_uses_first_three_digits() {
        assert_eq!(dictionary(200), 200);
        assert_eq!(dictionary(4016000305), 401);
        assert_eq!(dictionary(0), 200);
    }
}
