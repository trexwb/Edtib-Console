-- 0009_users —— 用户表
-- 译自老项目 electron/src/migrations/20260416000002_users.ts

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname        VARCHAR(255),
  truename        VARCHAR(255),
  email           VARCHAR(255) UNIQUE,
  mobile          VARCHAR(255),
  avatar          VARCHAR(255),
  password        VARCHAR(255),
  salt            VARCHAR(255),
  remember_token  VARCHAR(255),
  uuid            VARCHAR(255),
  secret          VARCHAR(255),
  extension       TEXT,
  status          INTEGER UNSIGNED DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at      DATETIME NOT NULL DEFAULT (datetime('now')),
  deleted_at      DATETIME
);
