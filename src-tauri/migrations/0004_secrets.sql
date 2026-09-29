-- 0004_secrets —— API访问密钥
-- 译自老项目 electron/src/migrations/20241219075411_secrets.ts
-- 注意：app_secret / app_iv 以 AES-256-CBC（cryptTool.defaultKey）密文存储，
--      读写由 Rust 侧 Cast::Crypt 与 electron 版 CastCrypt 完全等价。

CREATE TABLE IF NOT EXISTS secrets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       VARCHAR(255),
  app_id      VARCHAR(40),
  app_secret  VARCHAR(40),
  app_iv      VARCHAR(40),
  app_url     VARCHAR(255),
  extension   TEXT,
  status      TINYINT UNSIGNED DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  deleted_at  DATETIME
);
