-- 0013_categories —— 分类表
-- 译自老项目 electron/src/migrations/20260416000006_categories.ts

CREATE TABLE IF NOT EXISTS categories (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id     INTEGER UNSIGNED,
  names         TEXT,
  abbreviation  VARCHAR(255),
  covers        TEXT,
  remarks       TEXT,
  extension     TEXT,
  total         INTEGER UNSIGNED DEFAULT 0,
  sort          INTEGER UNSIGNED DEFAULT 0,
  status        INTEGER UNSIGNED DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at    DATETIME NOT NULL DEFAULT (datetime('now')),
  deleted_at    DATETIME
);
