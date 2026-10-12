//! 应用配置：本地链路凭证与出站网关凭证。
//!
//! 安全约定（对齐 AGENTS.md §6.3）：**源码不内置任何密钥**，凭证一律来自环境变量，
//! 由 `.env.test` / `.env.production`（经 `scripts/with-tauri-env.mjs` 注入进程）或
//! 密钥文件注入。缺失时按「失败关闭」处理（鉴权直接拒绝），而不是回退到某个内置默认值。
//!
//! | 环境变量 | 含义 | 对端口径 |
//! |---|---|---|
//! | `TAURI_LINK_ID` | 本地链路 appId（前端 ↔ Tauri 本地服务） | 前端 `VITE_APP_ID` |
//! | `TAURI_LINK_SECRET` | 本地链路 appSecret（AES-256 密钥，32 字符） | 前端 `VITE_APP_SECRET` |
//! | `TAURI_LINK_IV` | 本地链路 appIv（16 字符）：解密老格式固定 IV 密文，同时是「回包是否加密」的开关 | 老前端 `VITE_APP_IV`（新前端请求改用随机 IV，格式 `iv(hex):密文(hex)`） |
//! | `TAURI_FIELD_CRYPT_SECRET` / `TAURI_FIELD_CRYPT_IV` | 本地库字段级加密密钥（缺省由 `TAURI_LINK_SECRET` 派生） | — |
//! | `TAURI_APP_ID` / `_APP_SECRET` / `_APP_IV` / `_APP_BASE_URL` | tauri http 服务**出站调用后端**的网关凭证与服务地址 | `secrets` 表缺省兜底 |
//!
//! 说明：Tauri 版不再启动本地 HTTPS 服务，`LEGACY_SERVER_*` 仅作对照保留，不参与运行时逻辑。
//!
//! 前缀约定：`TAURI_*` = 桌面端（Tauri Rust 进程）使用的密钥，允许存放于密钥文件；
//! 其中 `TAURI_LINK_*` 为本地链路对（必须与同环境 `.env.test` / `.env.production` 的
//! `VITE_APP_*` 同一对，否则 4016000305），`TAURI_APP_*` 为出站网关凭证
//! （正式口径为本地 `secrets` 表加密存储，环境变量仅作缺省兜底）。
//! 老 `EDTIB_DEV_* / EDTIB_PROD_*` 双环境网关键已由「按环境文件选一套 `TAURI_APP_*`」取代。
//!
//! 注入方式（按优先级）：进程环境变量 > 密钥文件。
//! 密钥文件默认读 `<AppData>/console.env`，可用 `EDTIB_ENV_FILE` 指定绝对路径；
//! 打包后的桌面应用从 Finder / 快捷方式启动时不会继承 shell 环境，
//! 因此密钥文件是生产分发的实际入口（文件内容格式：`KEY=VALUE` 每行一条，支持 `#` 注释与引号）。

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::OnceLock;

/// 出站网关凭证（`secrets` 表缺省兜底；等价老 `cryptSecrets()[env]`）。
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

static LINK_APP_ID: OnceLock<String> = OnceLock::new();
static LINK_APP_SECRET: OnceLock<String> = OnceLock::new();
static LINK_APP_IV: OnceLock<String> = OnceLock::new();
static FIELD_CRYPT_SECRET: OnceLock<String> = OnceLock::new();
static FIELD_CRYPT_IV: OnceLock<String> = OnceLock::new();
static GATEWAY: OnceLock<CryptEnv> = OnceLock::new();

/// 本地链路鉴权 appId（前端 ↔ Tauri，口径同前端 `VITE_APP_ID`）。
pub fn link_app_id() -> &'static str {
    cached(&LINK_APP_ID, "TAURI_LINK_ID")
}

/// 本地链路对称密钥（前端 body 加密与代理鉴权共用，口径同 `VITE_APP_SECRET`）。
pub fn link_app_secret() -> &'static str {
    cached(&LINK_APP_SECRET, "TAURI_LINK_SECRET")
}

/// 本地链路 IV（口径同老前端 `VITE_APP_IV`）：仅用于解密老格式固定 IV 密文。
pub fn link_app_iv() -> &'static str {
    cached(&LINK_APP_IV, "TAURI_LINK_IV")
}

/// 本地库字段级加密密钥（等价 `cryptTool.defaultKey.secret`）。
/// 未单独配置时由 `TAURI_LINK_SECRET` 派生，避免同一份密钥材料在源码中出现两次。
pub fn field_crypt_secret() -> &'static str {
    FIELD_CRYPT_SECRET
        .get_or_init(|| {
            let configured = env_var("TAURI_FIELD_CRYPT_SECRET");
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
            let configured = env_var("TAURI_FIELD_CRYPT_IV");
            if configured.is_empty() {
                derived("iv", 16)
            } else {
                configured
            }
        })
        .as_str()
}

/// 由本地链路密钥派生固定长度片段（hex 子串）：`length` 个 hex 字符。
fn derived(label: &str, length: usize) -> String {
    use crate::crypt;
    let digest = crypt::sha256(&format!("{}|{label}", link_app_secret()));
    digest.chars().take(length).collect()
}

/// 启动自检：返回缺失/长度非法的环境变量名（供日志告警）。
pub fn missing_env() -> Vec<&'static str> {
    let mut missing = Vec::new();
    if link_app_id().is_empty() {
        missing.push("TAURI_LINK_ID");
    }
    if link_app_secret().len() != 32 {
        missing.push("TAURI_LINK_SECRET");
    }
    if link_app_iv().len() != 16 {
        missing.push("TAURI_LINK_IV");
    }
    // 出站地址与 appId/secret/iv 允许由本地 `secrets` 表提供，不在此断言；
    // 真正缺失时 proxy_request 会以明确的中文错误失败，避免这里误报
    missing
}

/// 自有网关 origin 白名单：正式包唯一的出网目的地（不含路径，scheme+host 口径）。
///
/// 这是「地址」而非「密钥」，写进源码不构成泄露；它存在的意义是让可被 `db_update`
/// 改写的 `secrets.app_url` 无法把签名请求带出 Edtib 自有域名。
pub const ALLOWED_GATEWAY_ORIGINS: &[&str] = &[
    "https://gateway.edtib.com",
    "https://gateway-dev.edtib.com",
    "https://gateway-stage.edtib.com",
];

/// 正式网关主机名（不含 dev/stage）。开发/测试构建默认禁止以此为出网目标。
///
/// 存在的意义：`TAURI_APP_BASE_URL` 缺失时会回落到本地 `secrets` 表的 `app_url`，
/// 而开发机上残留的正式口径密钥文件（`<AppData>/console.env`）同样会被读入——
/// 任一条链路都能把「测试构建」接到正式网关。审计要求这是不可能发生的事，
/// 所以在出网收口处按构建类型判定，而不是只靠脚本约定。
pub const PRODUCTION_GATEWAY_HOSTS: &[&str] = &["gateway.edtib.com"];

/// 主机名是否为正式网关（大小写不敏感，忽略端口）。
pub fn is_production_gateway_host(host: &str) -> bool {
    let host = host.split(':').next().unwrap_or_default().to_lowercase();
    PRODUCTION_GATEWAY_HOSTS.contains(&host.as_str())
}

/// 开发期联调正式网关的显式放行开关（默认关闭）。
/// 与 `scripts/with-tauri-env.mjs` 的 `EDTIB_TAURI_ALLOW_PROD_ENV` 同一口径：跨环境必须手动声明。
pub fn allow_prod_egress() -> bool {
    env_var("EDTIB_ALLOW_PROD_EGRESS") == "1"
}

/// 出站网关凭证：tauri http 服务调用后端时使用的 appId / secret / iv / 服务地址。
///
/// 环境由「当前生效的环境文件」决定（`npm run dev:test` → `.env.test`，
/// `npm run build` / 密钥文件 → `.env.production`），因此不再区分 `EDTIB_DEV_* / EDTIB_PROD_*`；
/// `secrets` 表有有效记录时表内凭证优先，地址则以这里的配置值为准（表内 `app_url` 仅兜底，
/// 且正式包必须落在 `ALLOWED_GATEWAY_ORIGINS` 内，见 `proxy::request::pin_origin`）。
///
/// 不再内置 dev/prod 兜底地址：静默兜底会让「测试配置 + 正式网关」这类跨环境污染
/// 顺利跑通而无人报错，正是本次审计要求消除的失败模式。
pub fn gateway() -> &'static CryptEnv {
    GATEWAY.get_or_init(|| CryptEnv {
        app_id: env_var("TAURI_APP_ID"),
        app_secret: env_var("TAURI_APP_SECRET"),
        app_iv: env_var("TAURI_APP_IV"),
        app_url: env_var("TAURI_APP_BASE_URL"),
    })
}

/// 老项目本地 HTTPS 服务地址（对照用：Tauri 版已由 `invoke` 取代）。
#[allow(dead_code)]
pub const LEGACY_SERVER_PROTOCOL: &str = "https";
#[allow(dead_code)]
pub const LEGACY_SERVER_HOST: &str = "localhost.edtib.com";
#[allow(dead_code)]
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

#[cfg(test)]
mod tests {
    use super::{env_file_path, is_production_gateway_host, parse_env_file};

    #[test]
    fn parses_key_value_lines_ignoring_comments_and_quotes() {
        let text = r#"
        # 本地链路密钥（32/16 字符）
        TAURI_LINK_ID=console-local
        TAURI_LINK_SECRET="xOi99fjEMa7kHbKyRfCfdfRJ72kiKKJ8"
        TAURI_LINK_IV='94xkXidOuhShVQNu'

        NODE_ENV = production
        NOT_A_PAIR_LINE
        =missing-key
        "#;
        let parsed = parse_env_file(text);
        assert_eq!(parsed.get("TAURI_LINK_ID").map(String::as_str), Some("console-local"));
        assert_eq!(
            parsed.get("TAURI_LINK_SECRET").map(String::as_str),
            Some("xOi99fjEMa7kHbKyRfCfdfRJ72kiKKJ8")
        );
        assert_eq!(parsed.get("TAURI_LINK_IV").map(String::as_str), Some("94xkXidOuhShVQNu"));
        // 键与值两侧空白都会被去掉
        assert_eq!(parsed.get("NODE_ENV").map(String::as_str), Some("production"));
        assert!(!parsed.contains_key("NOT_A_PAIR_LINE"));
        assert!(!parsed.contains_key(""));
        assert!(!parsed.contains_key("#"));
    }

    #[test]
    fn unquoted_value_keeps_inner_spaces_and_equals() {
        let parsed = parse_env_file("TAURI_APP_BASE_URL=https://gateway.edtib.com/api?a=1");
        assert_eq!(
            parsed.get("TAURI_APP_BASE_URL").map(String::as_str),
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

    /// 正式网关主机判定要能区分 dev/stage，且不受大小写与端口影响。
    #[test]
    fn production_gateway_host_matches_only_official_host() {
        assert!(is_production_gateway_host("gateway.edtib.com"));
        assert!(is_production_gateway_host("GATEWAY.edtib.com:443"));
        assert!(!is_production_gateway_host("gateway-dev.edtib.com"));
        assert!(!is_production_gateway_host("gateway-stage.edtib.com"));
        // 反向：以正式域名为后缀的伪装主机不得命中
        assert!(!is_production_gateway_host("gateway.edtib.com.evil.example"));
        assert!(!is_production_gateway_host(""));
    }
}
