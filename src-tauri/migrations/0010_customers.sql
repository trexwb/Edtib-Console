-- 0010_customers —— 客户表
-- 译自老项目 electron/src/migrations/20260416000003_customers.ts

CREATE TABLE IF NOT EXISTS customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid        VARCHAR(255),
  secret      VARCHAR(255),
  name        VARCHAR(255),
  contacts    VARCHAR(255),
  mobile      VARCHAR(255),
  email       VARCHAR(255),
  address     TEXT,
  extension   TEXT,
  status      INTEGER UNSIGNED DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  deleted_at  DATETIME
);
