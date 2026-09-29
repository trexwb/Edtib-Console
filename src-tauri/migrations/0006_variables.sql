-- 0006_variables —— 变量表
-- 译自老项目 electron/src/migrations/20260413000003_variables.ts

CREATE TABLE IF NOT EXISTS variables (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  names       TEXT,
  type        INTEGER DEFAULT 0,
  code        VARCHAR(60),
  variable    VARCHAR(60),
  remarks     TEXT,
  extension   TEXT,
  sort        INTEGER DEFAULT 0,
  status      INTEGER DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  deleted_at  DATETIME
);
