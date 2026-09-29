-- 0005_schedules —— 计划任务
-- 译自老项目 electron/src/migrations/20241228024407_schedules.ts

CREATE TABLE IF NOT EXISTS schedules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        VARCHAR(255),
  time        VARCHAR(255),
  handler     TEXT,
  status      TINYINT UNSIGNED DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  deleted_at  DATETIME
);
