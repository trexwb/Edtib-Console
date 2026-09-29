-- 0018_languages —— 多语言表
-- 译自老项目 electron/src/migrations/20260416000010_languages.ts

CREATE TABLE IF NOT EXISTS languages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          VARCHAR(255),
  code          VARCHAR(255) UNIQUE,
  abbreviation  VARCHAR(255),
  icon          VARCHAR(255),
  extension     TEXT,
  sort          INTEGER UNSIGNED DEFAULT 0,
  status        INTEGER UNSIGNED DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at    DATETIME NOT NULL DEFAULT (datetime('now'))
);
