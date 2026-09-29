-- 0002_seeds —— 种子数据执行记录
-- 译自老项目 electron/src/migrations/20241219075409_seeds.ts（只读参考）
-- 说明：SQLite 无长度/无符号约束，VARCHAR(n) 仅作语义标注；json 列以 TEXT 存储（由 Rust 侧 CastJson 负责序列化）。

CREATE TABLE IF NOT EXISTS seeds (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            VARCHAR(255),
  batch           INTEGER,
  migration_time  DATETIME
);
