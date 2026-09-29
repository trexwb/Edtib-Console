-- 0001_init —— 骨架占位迁移
--
-- 说明：老项目 ../client/console/electron/src/migrations 下的 Knex 迁移
--      （accounts / customers / products / standards / formulas / serials ...）
--      属于业务数据模型，待业务迁移阶段逐条翻译为 SQL 放到本目录，
--      命名规则：NNNN_描述.sql，按文件名顺序执行且只执行一次
--      （已应用记录写入 _schema_migrations 表）。
--      这里仅建立最小可运行结构，用于验证「Rust 侧迁移链路」是否打通。
--
-- 关于 SQLite 的定位（全局决策）：SQLite 能力**保留**，用于未来处理 AI 相关数据
--      与异步事务；但它**不作为本地业务数据的缓存**使用。本目录后续迁移应以
--      「AI / 异步事务」相关结构为准，不用于承载本地业务数据缓存。

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY NOT NULL,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at ON app_settings (updated_at);
