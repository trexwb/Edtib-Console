//! 加密工具：等价老项目 `electron/src/config/cryptTool.ts`。
//!
//! - `md5` / `sha256`：摘要（hex）
//! - `encrypt` / `decrypt`：aes-256-cbc + hex（与 Node `crypto.createCipheriv('aes-256-cbc')` 一致）
//! - `DEFAULT_SECRET` / `DEFAULT_IV`：等价 `cryptTool.defaultKey`

use aes::cipher::{block_padding::Pkcs7, BlockDecryptMut, BlockEncryptMut, KeyIvInit};
use aes::Aes256;
use serde_json::Value;
use sha2::{Digest, Sha256};

type Aes256CbcEnc = cbc::Encryptor<Aes256>;
type Aes256CbcDec = cbc::Decryptor<Aes256>;

/// 等价 `cryptTool.defaultKey.secret`。
pub const DEFAULT_SECRET: &str = "XAqeonSoFL92zUOSBTVeWIuYxXPEMkDX";
/// 等价 `cryptTool.defaultKey.iv`。
pub const DEFAULT_IV: &str = "94xkXidOuhShVQNu";

/// 等价 `cryptTool.md5`。
pub fn md5(input: &str) -> String {
    format!("{:x}", md5::compute(input.as_bytes()))
}

/// 等价 `cryptTool.sha256`。
pub fn sha256(input: &str) -> String {
    Sha256::digest(input.as_bytes())
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

/// 等价 `cryptTool.encrypt`：先 `JSON.stringify`，再 aes-256-cbc 加密为 hex。
/// 失败时返回空串（对应老项目返回 `false` 后由 `CastCrypt.set` 转成 `''`）。
pub fn encrypt(value: &Value, key: &str, iv: &str) -> String {
    let plain = match serde_json::to_string(value) {
        Ok(text) => text,
        Err(err) => {
            log::error!("加密前置序列化失败: {err}");
            return String::new();
        }
    };

    let cipher = match Aes256CbcEnc::new_from_slices(key.as_bytes(), iv.as_bytes()) {
        Ok(cipher) => cipher,
        Err(err) => {
            log::error!("aes-256-cbc 初始化失败: {err}");
            return String::new();
        }
    };

    let mut buffer = plain.into_bytes();
    let message_len = buffer.len();
    buffer.resize(message_len + 16, 0);
    match cipher.encrypt_padded_mut::<Pkcs7>(&mut buffer, message_len) {
        Ok(ciphertext) => hex::encode(ciphertext),
        Err(err) => {
            log::error!("aes-256-cbc 加密失败: {err}");
            String::new()
        }
    }
}

/// 等价 `cryptTool.decrypt`：hex → aes-256-cbc 解密 → `JSON.parse`。
/// 失败返回 `None`（对应老项目返回 `false`）。
pub fn decrypt(ciphertext: &str, key: &str, iv: &str) -> Option<Value> {
    let mut data = hex::decode(ciphertext).ok()?;
    let cipher = Aes256CbcDec::new_from_slices(key.as_bytes(), iv.as_bytes()).ok()?;
    let plain = cipher.decrypt_padded_mut::<Pkcs7>(&mut data).ok()?;
    let text = std::str::from_utf8(plain).ok()?;
    serde_json::from_str(text).ok()
}

/// 使用 `defaultKey` 加密（等价 `CastCrypt.set` 的调用方式）。
pub fn encrypt_default(value: &Value) -> String {
    encrypt(value, DEFAULT_SECRET, DEFAULT_IV)
}

/// 使用 `defaultKey` 解密（等价 `CastCrypt.get` 的调用方式）。
pub fn decrypt_default(ciphertext: &str) -> Option<Value> {
    decrypt(ciphertext, DEFAULT_SECRET, DEFAULT_IV)
}

/// 等价 web 前端 `encrypt()`（`src/utils/request.ts`）：
/// 每次生成随机 16 字节 IV，返回 `iv(hex) + ':' + 密文(hex)`；失败返回 `None`。
///
/// 老 electron 侧 `cryptTool.encrypt` 为固定 IV；该函数仅用于「本地 ↔ 网关」链路，
/// 与老 `requestMake` 中 `cryptTool.encrypt(data, appSecret, appIv)` 的落点一致。
pub fn encrypt_iv_prefixed(value: &Value, key: &str) -> Option<String> {
    if key.len() != 32 {
        log::error!("加密密钥长度必须为 32（当前 {}）", key.len());
        return None;
    }

    let mut iv = [0u8; 16];
    getrandom::getrandom(&mut iv).ok()?;
    let iv_hex = hex::encode(iv);

    let plain = serde_json::to_string(value).ok()?;
    let cipher = Aes256CbcEnc::new_from_slices(key.as_bytes(), &iv).ok()?;
    let mut buffer = plain.into_bytes();
    let message_len = buffer.len();
    buffer.resize(message_len + 16, 0);
    let ciphertext = cipher.encrypt_padded_mut::<Pkcs7>(&mut buffer, message_len).ok()?;

    Some(format!("{iv_hex}:{}", hex::encode(ciphertext)))
}

/// 自适应解密：优先按 `iv(hex) + ':' + 密文(hex)`（web 前端约定，随机 IV）解析；
/// 无 IV 前缀时退回固定 IV（老 electron 约定）。
///
/// 判定口径与 web 前端 `decrypt()` 一致：出现 `:` 即按 `iv:密文` 处理，
/// 不做「解不开再退回固定 IV」的兜底，避免把随机 IV 密文误判成固定 IV 密文。
pub fn decrypt_adaptive(ciphertext: &str, key: &str, legacy_iv: &str) -> Option<Value> {
    match split_iv_prefixed(ciphertext) {
        Some((iv_hex, payload)) => decrypt(payload, key, iv_hex),
        None => decrypt(ciphertext, key, legacy_iv),
    }
}

/// 拆出 `iv(hex):payload`；IV 必须是 16 字节（32 位 hex）。
fn split_iv_prefixed(ciphertext: &str) -> Option<(&str, &str)> {
    let (iv_hex, payload) = ciphertext.split_once(':')?;
    if iv_hex.len() != 32 || !iv_hex.chars().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }
    Some((iv_hex, payload))
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn roundtrip_object() {
        let value = json!({"app": "edtib", "n": 1});
        let encrypted = encrypt_default(&value);
        assert!(!encrypted.is_empty());
        assert_eq!(decrypt_default(&encrypted), Some(value));
    }

    #[test]
    fn roundtrip_string() {
        let value = json!("TBNIzfcM64ZdeCAouoykHHg9sKpkNN2T");
        let encrypted = encrypt_default(&value);
        assert_eq!(decrypt_default(&encrypted), Some(value));
    }

    #[test]
    fn digest_length() {
        assert_eq!(md5("edtib").len(), 32);
        assert_eq!(sha256("edtib").len(), 64);
    }

    #[test]
    fn roundtrip_random_iv() {
        let value = json!({"hello": "网关", "list": [1, 2, 3]});
        let key = "xOi99fjEMa7kHbKyRfCfdfRJ72kiKKJ8";
        let encrypted = encrypt_iv_prefixed(&value, key).expect("加密成功");
        // iv(32 hex) + ':' + 密文
        let (iv, payload) = encrypted.split_once(':').expect("含 iv 前缀");
        assert_eq!(iv.len(), 32);
        assert!(!payload.is_empty());
        assert_eq!(decrypt_adaptive(&encrypted, key, "FWCUj3fDbM2yDUJQ"), Some(value));
    }

    #[test]
    fn adaptive_decrypt_falls_back_to_fixed_iv() {
        // 老 electron 约定：无 iv 前缀 → 用固定 IV 解密
        let value = json!({"legacy": true});
        let key = "xOi99fjEMa7kHbKyRfCfdfRJ72kiKKJ8";
        let encrypted = encrypt(&value, key, "FWCUj3fDbM2yDUJQ");
        assert!(!encrypted.contains(':'));
        assert_eq!(decrypt_adaptive(&encrypted, key, "FWCUj3fDbM2yDUJQ"), Some(value));
    }
}
