//! 应用配置：本地代理链路凭证与网关凭证。
//!
//! 安全约定（对齐 AGENTS.md §6.3）：**源码不内置任何密钥**，凭证一律来自环境变量，
//! 由 `.env` / 打包脚本 / CI 注入。缺失时按「失败关闭」处理（鉴权直接拒绝），
//! 而不是回退到某个内置默认值。
//!
//! | 环境变量 | 含义 | 对端口径 |
//! |---|---|---|
//! | `EDTIB_APP_ID` | 本地链路 appId | 前端 `VITE_APP_ID` |
//! | `EDTIB_APP_SECRET` | 本地链路 appSecret（AES-256 密钥，32 字符） | 前端 `VITE_APP_SECRET` |
//! | `EDTIB_APP_IV` | 本地链路 appIv（16 字符）：解密老格式固定 IV 密文，同时是「回包是否加密」的开关 | 老前端 `VITE_APP_IV`（新前端请求改用随机 IV，格式 `iv(hex):密文(hex)`） |
//! | `EDTIB_FIELD_CRYPT_SECRET` / `EDTIB_FIELD_CRYPT_IV` | 本地库字段级加密密钥（缺省由 `EDTIB_APP_SECRET` 派生） | — |
//! | `EDTIB_DEV_APP_ID` / `_APP_SECRET` / `_APP_IV` / `_APP_URL` | 开发环境网关凭证 | `secrets` 表缺省兜底 |
//! | `EDTIB_PROD_APP_ID` / `_APP_SECRET` / `_APP_IV` / `_APP_URL` | 生产环境网关凭证 | `secrets` 表缺省兜底 |
//!
//! 说明：Tauri 版不再启动本地 HTTPS 服务，`LEGACY_SERVER_*` 仅作对照保留，不参与运行时逻辑。
//!
//! 注入方式（按优先级）：进程环境变量 > 密钥文件。
//! 密钥文件默认读 `<AppData>/console.env`，可用 `EDTIB_ENV_FILE` 指定绝对路径；
//! 打包后的桌面应用从 Finder / 快捷方式启动时不会继承 shell 环境，
//! 因此密钥文件是生产分发的实际入口（文件内容格式：`KEY=VALUE` 每行一条，支持 `#` 注释与引号）。

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::OnceLock;

/// 单个环境的网关凭证（等价老 `cryptSecrets()[env]`）。
#[derive(Debug, Clone)]
pub struct CryptEnv {
    pub app_id: String,
    pub app_secret: String,
    pub app_iv: String,
    pub app_url: String,
}

static FILE_ENV: OnceLock<HashMap<String, String>> = OnceLock::new();
static ENV_FILE_PATH: OnceLock<Option<PathBuf>> = OnceLock::new();

/// 启动时注入密钥文件（在读取任何配置项之前调用）。
///
/// `app_data_dir` 由 `lib.rs` 的 setup 传入；未传时仅识别 `EDTIB_ENV_FILE`。
pub fn init(app_data_dir: Option<PathBuf>) {
    let _ = ENV_FILE_PATH.set(resolved_env_file(app_data_dir));
    // 触发一次解析，避免首个命令承担文件 IO
    let _ = file_env();
}

/// 密钥文件路径：`EDTIB_ENV_FILE`（绝对路径）优先，其次 `<AppData>/console.env`。
fn resolved_env_file(app_data_dir: Option<PathBuf>) -> Option<PathBuf> {
    let explicit = std::env::var("EDTIB_ENV_FILE").unwrap_or_default();
    if !explicit.trim().is_empty() {
        return Some(PathBuf::from(explicit.trim()));
    }
    app_data_dir.map(|dir| dir.join("console.env"))
}

fn env_file_path() -> Option<PathBuf> {
    ENV_FILE_PATH
        .get_or_init(|| resolved_env_file(None))
        .clone()
}

/// 解析密钥文件为键值表；文件缺失时返回空表（此时仅依赖进程环境变量）。
fn file_env() -> &'static HashMap<String, String> {
    FILE_ENV.get_or_init(|| match env_file_path() {
        Some(path) => match std::fs::read_to_string(&path) {
            Ok(text) => {
                let parsed = parse_env_file(&text);
                log::info!(
                    "已加载密钥文件 {}（{} 项）",
                    path.display(),
                    parsed.len()
                );
                parsed
            }
            Err(err) if err.kind() == std::io::ErrorKind::NotFound => HashMap::new(),
            Err(err) => {
                log::error!("读取密钥文件失败 {}：{err}", path.display());
                HashMap::new()
            }
        },
        None => HashMap::new(),
    })
}

/// 逐行解析 `KEY=VALUE`（忽略空行与 `#` 注释，去掉值两侧成对的引号）。
fn parse_env_file(text: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let Some((key, value)) = line.split_once('=') else {
            continue;
        };
        let key = key.trim();
        if key.is_empty() {
            continue;
        }
        let value = value.trim();
        let value = value
            .strip_prefix(['"', '\''])
            .and_then(|v| v.strip_suffix(['"', '\'']))
            .unwrap_or(value)
            .to_string();
        map.insert(key.to_string(), value);
    }
    map
}

/// 读取配置项：进程环境变量优先，缺失时回落密钥文件；均无则空串。
fn env_var(name: &str) -> String {
    let from_process = std::env::var(name).unwrap_or_default();
    if !from_process.trim().is_empty() {
        return from_process.trim().to_string();
    }
    file_env().get(name).map(|v| v.trim().to_string()).unwrap_or_default()
}

fn cached(slot: &'static OnceLock<String>, name: &str) -> &'static str {
    slot.get_or_init(|| env_var(name)).as_str()
}

static LOCAL_APP_ID: OnceLock<String> = OnceLock::new();
static LOCAL_APP_SECRET: OnceLock<String> = OnceLock::new();
static LOCAL_APP_IV: OnceLock<String> = OnceLock::new();
static FIELD_CRYPT_SECRET: OnceLock<String> = OnceLock::new();
static FIELD_CRYPT_IV: OnceLock<String> = OnceLock::new();
static DEVELOPMENT: OnceLock<CryptEnv> = OnceLock::new();
static PRODUCTION: OnceLock<CryptEnv> = OnceLock::new();

/// 等价 `cryptSecrets().appId`：本地链路鉴权 appId。
pub fn app_id() -> &'static str {
    cached(&LOCAL_APP_ID, "EDTIB_APP_ID")
}

/// 等价 `cryptSecrets().appSecret`：前端与本地代理链路共用的对称密钥。
pub fn app_secret() -> &'static str {
    cached(&LOCAL_APP_SECRET, "EDTIB_APP_SECRET")
}

/// 等价 `cryptSecrets().appIv`。
pub fn app_iv() -> &'static str {
    cached(&LOCAL_APP_IV, "EDTIB_APP_IV")
}

/// 本地库字段级加密密钥（等价 `cryptTool.defaultKey.secret`）。
/// 未单独配置时由 `EDTIB_APP_SECRET` 派生，避免同一份密钥材料在源码中出现两次。
pub fn field_crypt_secret() -> &'static str {
    FIELD_CRYPT_SECRET
        .get_or_init(|| {
            let configured = env_var("EDTIB_FIELD_CRYPT_SECRET");
            if configured.is_empty() {
                derived("key", 32)
            } else {
                configured
            }
        })
        .as_str()
}

/// 本地库字段级加密 IV（等价 `cryptTool.defaultKey.iv`）。
pub fn field_crypt_iv() -> &'static str {
    FIELD_CRYPT_IV
        .get_or_init(|| {
            let configured = env_var("EDTIB_FIELD_CRYPT_IV");
            if configured.is_empty() {
                derived("iv", 16)
            } else {
                configured
            }
        })
        .as_str()
}

/// 由本地密钥派生固定长度片段（hex 子串）：`length` 个 hex 字符。
fn derived(label: &str, length: usize) -> String {
    use crate::crypt;
    let digest = crypt::sha256(&format!("{}|{label}", app_secret()));
    digest.chars().take(length).collect()
}

/// 启动自检：返回缺失/长度非法的环境变量名（供日志告警）。
pub fn missing_env() -> Vec<&'static str> {
    let mut missing = Vec::new();
    if app_id().is_empty() {
        missing.push("EDTIB_APP_ID");
    }
    if app_secret().len() != 32 {
        missing.push("EDTIB_APP_SECRET");
    }
    if app_iv().len() != 16 {
        missing.push("EDTIB_APP_IV");
    }
    missing
}

fn read_env(prefix: &str, default_url: &str) -> CryptEnv {
    let app_url = env_var(&format!("EDTIB_{prefix}_APP_URL"));
    CryptEnv {
        app_id: env_var(&format!("EDTIB_{prefix}_APP_ID")),
        app_secret: env_var(&format!("EDTIB_{prefix}_APP_SECRET")),
        app_iv: env_var(&format!("EDTIB_{prefix}_APP_IV")),
        app_url: if app_url.is_empty() {
            default_url.to_string()
        } else {
            app_url
        },
    }
}

/// 等价 `cryptSecrets().development`（网关地址非密钥，保留默认可用）。
pub fn development() -> &'static CryptEnv {
    DEVELOPMENT.get_or_init(|| read_env("DEV", "https://gateway-dev.edtib.com/api"))
}

/// 等价 `cryptSecrets().production`。
pub fn production() -> &'static CryptEnv {
    PRODUCTION.get_or_init(|| read_env("PROD", "https://gateway.edtib.com/api"))
}

/// 老项目本地 HTTPS 服务地址（对照用：Tauri 版已由 `invoke` 取代）。
pub const LEGACY_SERVER_PROTOCOL: &str = "https";
pub const LEGACY_SERVER_HOST: &str = "localhost.edtib.com";
pub const LEGACY_SERVER_PORT: u16 = 64580;

/// 等价 `process.env.NODE_ENV || 'production'`：
/// Tauri 以编译类型区分（`tauri dev` = debug → development）。
pub fn is_development() -> bool {
    let node_env = env_var("NODE_ENV");
    if !node_env.is_empty() {
        return node_env == "development";
    }
    cfg!(debug_assertions)
}

/// 当前环境的网关密钥配置（等价 `cryptSecrets()[env]`）。
pub fn env_config() -> &'static CryptEnv {
    if is_development() {
        development()
    } else {
        production()
    }
}

#[cfg(test)]
mod tests {
    use super::{env_file_path, parse_env_file};

    #[test]
    fn parses_key_value_lines_ignoring_comments_and_quotes() {
        let text = r#"
        # 本地链路密钥（32/16 字符）
        EDTIB_APP_ID=console-local
        EDTIB_APP_SECRET="xOi99fjEMa7kHbKyRfCfdfRJ72kiKKJ8"
        EDTIB_APP_IV='94xkXidOuhShVQNu'

        NODE_ENV = production
        NOT_A_PAIR_LINE
        =missing-key
        "#;
        let parsed = parse_env_file(text);
        assert_eq!(parsed.get("EDTIB_APP_ID").map(String::as_str), Some("console-local"));
        assert_eq!(
            parsed.get("EDTIB_APP_SECRET").map(String::as_str),
            Some("xOi99fjEMa7kHbKyRfCfdfRJ72kiKKJ8")
        );
        assert_eq!(parsed.get("EDTIB_APP_IV").map(String::as_str), Some("94xkXidOuhShVQNu"));
        // 键与值两侧空白都会被去掉
        assert_eq!(parsed.get("NODE_ENV").map(String::as_str), Some("production"));
        assert!(!parsed.contains_key("NOT_A_PAIR_LINE"));
        assert!(!parsed.contains_key(""));
        assert!(!parsed.contains_key("#"));
    }

    #[test]
    fn unquoted_value_keeps_inner_spaces_and_equals() {
        let parsed = parse_env_file("EDTIB_PROD_APP_URL=https://gateway.edtib.com/api?a=1");
        assert_eq!(
            parsed.get("EDTIB_PROD_APP_URL").map(String::as_str),
            Some("https://gateway.edtib.com/api?a=1")
        );
    }

    #[test]
    fn env_file_path_is_absent_when_neither_source_configured() {
        // 未调用 init()、且进程环境无 EDTIB_ENV_FILE 时不应猜测路径：
        // 此时密钥只能来自进程环境变量，代理按「失败关闭」处理。
        if std::env::var_os("EDTIB_ENV_FILE").is_none() {
            assert!(env_file_path().is_none());
        }
    }
}
