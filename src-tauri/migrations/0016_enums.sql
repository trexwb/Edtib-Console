-- 0016_enums —— 枚举配置表
-- 译自老项目 electron/src/migrations/20260416000008_enums.ts

CREATE TABLE IF NOT EXISTS enums (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        VARCHAR(255),
  key         VARCHAR(255),
  value       VARCHAR(255),
  sort        INTEGER UNSIGNED DEFAULT 0,
  status      INTEGER UNSIGNED DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);
