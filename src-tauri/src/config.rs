//! 应用配置常量：等价老项目 `electron/src/config/index.ts`（`cryptSecrets()`）与
//! `electron/src/index.ts` 的 `envConfig`。
//!
//! 说明：Tauri 版不再启动本地 HTTPS 服务，因此 `envConfig`（protocol/host/port）
//! 仅作对照保留，不参与运行时逻辑。

/// 等价 `cryptSecrets().appId`（服务端鉴权用，本地已无 HTTP 服务，仅保留对照）。
pub const APP_ID: &str = "5332564304196326";
/// 等价 `cryptSecrets().appSecret`。
pub const APP_SECRET: &str = "xOi99fjEMa7kHbKyRfCfdfRJ72kiKKJ8";
/// 等价 `cryptSecrets().appIv`。
pub const APP_IV: &str = "FWCUj3fDbM2yDUJQ";

/// 等价 `cryptSecrets().development`。
#[derive(Debug, Clone, Copy)]
pub struct CryptEnv {
    pub app_id: &'static str,
    pub app_secret: &'static str,
    pub app_iv: &'static str,
    pub app_url: &'static str,
}

/// 等价 `cryptSecrets().development`。
pub const DEVELOPMENT: CryptEnv = CryptEnv {
    app_id: "3111292060595218",
    app_secret: "TBNIzfcM64ZdeCAouoykHHg9sKpkNN2T",
    app_iv: "3Tazn7jEblSCaTof",
    app_url: "https://gateway-dev.edtib.com/api",
};

/// 等价 `cryptSecrets().production`。
pub const PRODUCTION: CryptEnv = CryptEnv {
    app_id: "8760771533501686",
    app_secret: "wjbeqd3tCzJWKktRbMreihIxjl9UJzCU",
    app_iv: "iykg92BC9rbUoz0H",
    app_url: "https://gateway.edtib.com/api",
};

/// 老项目本地 HTTPS 服务地址（对照用：Tauri 版已由 `invoke` 取代）。
pub const LEGACY_SERVER_PROTOCOL: &str = "https";
pub const LEGACY_SERVER_HOST: &str = "localhost.edtib.com";
pub const LEGACY_SERVER_PORT: u16 = 64580;

/// 等价老项目 `process.env.NODE_ENV || 'production'`：
/// Tauri 以编译类型区分（`tauri dev` = debug → development）。
pub fn is_development() -> bool {
    if let Ok(node_env) = std::env::var("NODE_ENV") {
        return node_env == "development";
    }
    cfg!(debug_assertions)
}

/// 当前环境的网关密钥配置（等价 `cryptSecrets()[env]`）。
pub fn env_config() -> &'static CryptEnv {
    if is_development() {
        &DEVELOPMENT
    } else {
        &PRODUCTION
    }
}
