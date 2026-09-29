-- 0019_servers —— 应用服务器表
-- 译自老项目 electron/src/migrations/20260416000011_servers.ts

CREATE TABLE IF NOT EXISTS servers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        VARCHAR(255),
  url         VARCHAR(255),
  key         VARCHAR(255),
  app_id      VARCHAR(255),
  extension   TEXT,
  status      INTEGER UNSIGNED DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);
