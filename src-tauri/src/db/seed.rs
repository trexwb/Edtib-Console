//! 运行时种子数据：等价老项目 `electron/src/seeds/*.ts`（knex seed）。
//!
//! 迁移背景：老项目启动时由 knex 执行两份 seed 文件，通过「`seeds` 登记表 + `COUNT(*) === 0`」
//! 双重判定做幂等，把网关凭证行与两条定时任务行写入本地 SQLite：
//! - `seeds/20241219075411_secrets.ts` → `secrets` 表一行（`app_secret` / `app_iv` 经 `CastCrypt` 加密）；
//! - `seeds/20241219075414_schedules.ts` → `schedules` 表两行（`heartbeatTask` / `updateTask`）。
//!
//! 为什么放在 Rust 启动流程而不是 SQL migration：
//! 1. `app_secret` / `app_iv` 必须加密后落库，SQL 静态迁移无法表达（新侧复用 `Cast::Crypt`，
//!    与老 `new CastCrypt({}).set(...)` 等价，见 `models/cast.rs` 的 `crypt_set`）；
//! 2. 两份种子都带「表为空才写入」的运行时判定，超出静态 SQL 迁移的能力范围。
//!
//! 行为对齐与差异：
//! - 幂等判据由「`seeds` 登记表 + 表空」等价收敛为「业务表空」——老项目登记行只在插入成功后写入，
//!   而插入的前置条件就是表空，两者判定等价；新实现不再写 `seeds` 登记表（该表仅作历史结构保留）；
//! - 老种子在插入前会执行 `knex('secrets').del()` / `knex('schedules').del()`：因前置判定已保证表为空，
//!   该删除为死代码，新实现不执行任何删除动作（更安全，行为等价）；
//! - 写入的 `app_url` / 凭证随构建环境选择（等价老 `process.env.NODE_ENV` 选 `cryptSecrets()[env]`），
//!   由 [`crate::config::env_config`] 决定。
//! 以上差异决策记录见 `docs/migration-coverage.md`（对齐项 D-03）。

use rusqlite::Connection;
use serde_json::json;

use crate::config;
use crate::db::query;
use crate::error::{AppError, AppResult};
use crate::models;

/// 等价 `seeds/20241219075414_schedules.ts` 写入的定时任务行：`(name, time, handler.require)`。
pub const SEED_SCHEDULES: [(&str, &str, &str); 2] = [
    ("检查心跳", "0 */3 * * * *", "heartbeatTask"),
    ("检查更新", "30 0 * * * *", "updateTask"),
];

/// 种子执行结果（供启动日志与「覆盖度核对」使用）。
#[derive(Debug, Default, Clone, Copy)]
pub struct SeedReport {
    /// `secrets` 表本次是否写入凭证行
    pub secrets_inserted: bool,
    /// `schedules` 表本次写入行数
    pub schedules_inserted: usize,
}

/// 执行全部运行时种子（等价老项目启动流程中的 knex seed）。
pub fn run(conn: &Connection) -> AppResult<SeedReport> {
    let report = SeedReport {
        secrets_inserted: seed_secrets(conn, config::env_config())?,
        schedules_inserted: seed_schedules(conn)?,
    };
    if report.secrets_inserted || report.schedules_inserted > 0 {
        log::info!(
            "已应用运行时种子：secrets={} 条，schedules={} 条",
            u8::from(report.secrets_inserted),
            report.schedules_inserted
        );
    }
    Ok(report)
}

/// 等价 `seeds/20241219075411_secrets.ts`：`secrets` 为空时写入一行网关凭证。
///
/// `app_secret` / `app_iv` 在 [`models`] 中声明为 `Cast::Crypt`，`query::create` 写入时自动加密，
/// 与老项目 `doCrypt.set(envConfig.app_secret)` 口径一致。
pub fn seed_secrets(conn: &Connection, env: &config::CryptEnv) -> AppResult<bool> {
    let model = models::find("secrets").map_err(AppError::other)?;
    if !query::get_all(conn, model, &json!({}))?.is_empty() {
        return Ok(false);
    }

    query::create(
        conn,
        model,
        &json!({
            "title": "后台客户端",
            "app_id": env.app_id,
            "app_secret": env.app_secret,
            "app_iv": env.app_iv,
            "app_url": env.app_url,
            "status": 1,
        }),
    )?;
    log::info!("已写入 secrets 种子（等价 20241219075411_secrets.ts）：{}", env.app_url);
    Ok(true)
}

/// 等价 `seeds/20241219075414_schedules.ts`：`schedules` 为空时写入定时任务行。
///
/// `handler` 由 `Cast::Json` 序列化为 JSON 字符串，等价老 `JSON.stringify({ require })`；
/// cron 为 6 段式（含秒），由 [`crate::schedule`] 的本地 cron 解析器消费。
pub fn seed_schedules(conn: &Connection) -> AppResult<usize> {
    let model = models::find("schedules").map_err(AppError::other)?;
    if !query::get_all(conn, model, &json!({}))?.is_empty() {
        return Ok(0);
    }

    for (name, time, require) in SEED_SCHEDULES {
        query::create(
            conn,
            model,
            &json!({
                "name": name,
                "time": time,
                "handler": { "require": require },
                "status": 1,
            }),
        )?;
    }
    log::info!(
        "已写入 schedules 种子（等价 20241219075414_schedules.ts）：{} 条",
        SEED_SCHEDULES.len()
    );
    Ok(SEED_SCHEDULES.len())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypt;

    /// 内存库 + 相关建表 SQL（与 `migrations/*.sql` 同一份源文件）。
    fn memory_db() -> Connection {
        let conn = Connection::open_in_memory().expect("打开内存数据库");
        for sql in [
            include_str!("../../migrations/0004_secrets.sql"),
            include_str!("../../migrations/0005_schedules.sql"),
        ] {
            conn.execute_batch(sql).expect("建表");
        }
        conn
    }

    #[test]
    fn seed_is_idempotent_and_matches_legacy_data() {
        let conn = memory_db();
        let env = config::env_config();

        // 首次：等价老两份 seed 文件的写入结果
        let first = run(&conn).expect("首次种子");
        assert!(first.secrets_inserted, "secrets 应在表空时写入");
        assert_eq!(first.schedules_inserted, 2, "schedules 应写入 2 行");

        // 再次：幂等，不再写入
        let second = run(&conn).expect("重复种子");
        assert!(!second.secrets_inserted);
        assert_eq!(second.schedules_inserted, 0);

        // 落库形态：密文存储 + 与老种子一致的字段取值
        let (raw_secret, raw_url): (String, String) = conn
            .query_row("SELECT app_secret, app_url FROM secrets", [], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })
            .expect("读取 secrets");
        assert_ne!(raw_secret, env.app_secret, "app_secret 必须以密文落库");
        assert_eq!(
            crypt::decrypt_default(&raw_secret),
            Some(json!(env.app_secret)),
            "密文应可解回环境配置明文（等价老 CastCrypt）"
        );
        assert_eq!(raw_url, env.app_url);

        // 模型读取口径：Crypt 解密、Json 反序列化（前端拿到的形状与老项目一致）
        let secrets = models::find("secrets").expect("secrets 模型");
        let rows = query::get_all(&conn, secrets, &json!({})).expect("读取 secrets");
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0]["title"], json!("后台客户端"));
        assert_eq!(rows[0]["app_secret"], json!(env.app_secret));
        assert_eq!(rows[0]["status"], json!(1));

        let schedules = models::find("schedules").expect("schedules 模型");
        let rows = query::get_all(&conn, schedules, &json!({})).expect("读取 schedules");
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0]["time"], json!("0 */3 * * * *"));
        assert_eq!(rows[0]["handler"]["require"], json!("heartbeatTask"));
        assert_eq!(rows[1]["time"], json!("30 0 * * * *"));
        assert_eq!(rows[1]["handler"]["require"], json!("updateTask"));
    }
}
