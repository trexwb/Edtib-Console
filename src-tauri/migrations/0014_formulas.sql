-- 0014_formulas —— 公式表
-- 译自老项目 electron/src/migrations/20260416000006a_formulas.ts

CREATE TABLE IF NOT EXISTS formulas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        INTEGER UNSIGNED DEFAULT 0,
  shape_id    INTEGER UNSIGNED,
  names       TEXT,
  code        VARCHAR(40),
  columnar    VARCHAR(255),
  remarks     TEXT,
  extension   TEXT,
  sort        INTEGER UNSIGNED DEFAULT 0,
  status      INTEGER UNSIGNED DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at  DATETIME NOT NULL DEFAULT (datetime('now')),
  deleted_at  DATETIME
);
