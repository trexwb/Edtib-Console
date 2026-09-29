-- 0017_serials —— 序列号/优惠券表
-- 译自老项目 electron/src/migrations/20260416000009_serials.ts

CREATE TABLE IF NOT EXISTS serials (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  batch        VARCHAR(255),
  code         VARCHAR(255) NOT NULL UNIQUE,
  secret       VARCHAR(255),
  type         INTEGER UNSIGNED DEFAULT 0,
  level        INTEGER UNSIGNED DEFAULT 0,
  days         INTEGER UNSIGNED DEFAULT 0,
  credit       INTEGER UNSIGNED DEFAULT 0,
  price        INTEGER UNSIGNED DEFAULT 0,
  remark       VARCHAR(255),
  extension    TEXT,
  times_expire DATETIME,
  uuid         VARCHAR(255),
  status       INTEGER UNSIGNED DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at   DATETIME NOT NULL DEFAULT (datetime('now')),
  deleted_at   DATETIME
);
