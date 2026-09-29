-- 0007_docs —— 下载资料
-- 译自老项目 electron/src/migrations/20260413000004_docs.ts

CREATE TABLE IF NOT EXISTS docs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id      INTEGER,
  title        VARCHAR(255),
  path         VARCHAR(255),
  detail       TEXT,
  credit       INTEGER UNSIGNED DEFAULT 0,
  times_expire DATETIME,
  extension    TEXT,
  status       INTEGER UNSIGNED DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at   DATETIME NOT NULL DEFAULT (datetime('now')),
  deleted_at   DATETIME
);
