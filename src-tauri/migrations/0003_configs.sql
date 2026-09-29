-- 0003_configs —— 配置表（键值）
-- 译自老项目 electron/src/migrations/20241219075410_configs.ts

CREATE TABLE IF NOT EXISTS configs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  key         VARCHAR(255),
  value       TEXT,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  deleted_at  DATETIME
);
