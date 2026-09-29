//! 本地数据库模块。
//!
//! 决策：老项目 `electron/` 内嵌的 Express + Knex + SQLite 本地服务，在 Tauri 版改为
//! Rust 原生实现（`rusqlite` + SQL migrations），不再保留 Node 本地服务进程，
//! 因此也就不需要 Node sidecar。详见 `docs/electron-to-tauri.md`。

use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::Connection;
use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::error::{AppError, AppResult};

pub mod query;
pub mod seed;

/// 已编译进二进制的迁移脚本，与 `src-tauri/migrations/*.sql` 一一对应。
/// 新增迁移时：放入 sql 文件 + 在此登记（保证顺序与幂等）。
const MIGRATIONS: &[(&str, &str)] = &[
    ("0001_init", include_str!("../../migrations/0001_init.sql")),
    ("0002_seeds", include_str!("../../migrations/0002_seeds.sql")),
    ("0003_configs", include_str!("../../migrations/0003_configs.sql")),
    ("0004_secrets", include_str!("../../migrations/0004_secrets.sql")),
    (
        "0005_schedules",
        include_str!("../../migrations/0005_schedules.sql"),
    ),
    (
        "0006_variables",
        include_str!("../../migrations/0006_variables.sql"),
    ),
    ("0007_docs", include_str!("../../migrations/0007_docs.sql")),
    (
        "0008_accounts",
        include_str!("../../migrations/0008_accounts.sql"),
    ),
    ("0009_users", include_str!("../../migrations/0009_users.sql")),
    (
        "0010_customers",
        include_str!("../../migrations/0010_customers.sql"),
    ),
    (
        "0011_standards",
        include_str!("../../migrations/0011_standards.sql"),
    ),
    ("0012_shapes", include_str!("../../migrations/0012_shapes.sql")),
    (
        "0013_categories",
        include_str!("../../migrations/0013_categories.sql"),
    ),
    (
        "0014_formulas",
        include_str!("../../migrations/0014_formulas.sql"),
    ),
    (
        "0015_products",
        include_str!("../../migrations/0015_products.sql"),
    ),
    ("0016_enums", include_str!("../../migrations/0016_enums.sql")),
    (
        "0017_serials",
        include_str!("../../migrations/0017_serials.sql"),
    ),
    (
        "0018_languages",
        include_str!("../../migrations/0018_languages.sql"),
    ),
    (
        "0019_servers",
        include_str!("../../migrations/0019_servers.sql"),
    ),
];

/// 本地 SQLite 句柄。`rusqlite::Connection` 非 Sync，故用 `Mutex` 包裹后交给 Tauri 托管。
///
/// 定位说明：保留 SQLite 能力，供未来 AI 与异步事务处理使用；
/// **不作为**本地业务数据的缓存，请勿在此基础上扩展「本地业务数据缓存」用途。
pub struct Database {
    conn: Mutex<Connection>,
    path: PathBuf,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseStatus {
    /// 数据库文件的绝对路径（AppData 目录下）
    pub path: String,
    /// 当前二进制内登记的迁移数量
    pub migration_count: usize,
    /// 已应用（写入 _schema_migrations）的迁移数量
    pub applied_count: i64,
    /// SQLite 版本
    pub sqlite_version: String,
}

impl Database {
    /// 打开（必要时创建）AppData 目录下的 SQLite 文件，并执行迁移。
    pub fn open(app: &AppHandle) -> AppResult<Self> {
        let dir = app.path().app_data_dir()?;
        std::fs::create_dir_all(&dir)?;

        let path = dir.join("edtib-console.db");
        let conn = Connection::open(&path)?;
        // WAL 提高并发读写表现；开启外键约束（老项目 Knex 侧同样依赖外键）
        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")?;

        run_migrations(&conn)?;
        // 运行时种子（等价老项目 knex seed：secrets 凭证行 + schedules 调度行），见 `db/seed.rs`
        seed::run(&conn)?;
        log::info!("本地数据库已就绪: {}", path.display());

        Ok(Self {
            conn: Mutex::new(conn),
            path,
        })
    }

    /// 以同步闭包访问连接（单次持锁、不跨 await），供命令层与转发层复用。
    pub fn with_conn<T>(&self, handler: impl FnOnce(&Connection) -> AppResult<T>) -> AppResult<T> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::other("数据库连接锁已被污染（poisoned）"))?;
        handler(&conn)
    }

    /// 数据库现状（供前端/诊断使用）。
    pub fn status(&self) -> AppResult<DatabaseStatus> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| AppError::other("数据库连接锁已被污染（poisoned）"))?;

        let applied_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM _schema_migrations",
            [],
            |row| row.get(0),
        )?;
        let sqlite_version: String =
            conn.query_row("SELECT sqlite_version()", [], |row| row.get(0))?;

        Ok(DatabaseStatus {
            path: self.path.display().to_string(),
            migration_count: MIGRATIONS.len(),
            applied_count,
            sqlite_version,
        })
    }
}

/// 极简迁移执行器：按登记顺序执行未应用过的迁移，并记录到 `_schema_migrations`。
/// 业务迁移阶段可替换为 sqlx / refinery，此处不引入额外依赖以保持骨架轻量。
fn run_migrations(conn: &Connection) -> AppResult<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _schema_migrations (
            name       TEXT PRIMARY KEY NOT NULL,
            applied_at TEXT NOT NULL
        )",
    )?;

    for (name, sql) in MIGRATIONS {
        let applied: i64 = conn.query_row(
            "SELECT COUNT(*) FROM _schema_migrations WHERE name = ?1",
            [name],
            |row| row.get(0),
        )?;
        if applied > 0 {
            continue;
        }
        conn.execute_batch(sql)?;
        conn.execute(
            "INSERT INTO _schema_migrations (name, applied_at) VALUES (?1, datetime('now'))",
            [name],
        )?;
        log::info!("已应用数据库迁移: {name}");
    }

    Ok(())
}
