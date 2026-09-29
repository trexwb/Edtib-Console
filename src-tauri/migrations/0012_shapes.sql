-- 0012_shapes —— 形状表
-- 译自老项目 electron/src/migrations/20260416000005_shapes.ts

CREATE TABLE IF NOT EXISTS shapes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  names         TEXT,
  abbreviation  VARCHAR(255),
  covers        TEXT,
  remarks       TEXT,
  extension     TEXT,
  sort          INTEGER UNSIGNED DEFAULT 0,
  status        INTEGER UNSIGNED DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at    DATETIME NOT NULL DEFAULT (datetime('now')),
  deleted_at    DATETIME
);
