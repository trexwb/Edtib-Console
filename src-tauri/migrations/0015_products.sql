-- 0015_products —— 产品表
-- 译自老项目 electron/src/migrations/20260416000007_products.ts

CREATE TABLE IF NOT EXISTS products (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  standard_id     INTEGER UNSIGNED,
  names           TEXT,
  standard        VARCHAR(255),
  grade           VARCHAR(255),
  code            VARCHAR(255),
  year            VARCHAR(255),
  covers          TEXT,
  svgs            TEXT,
  renders         TEXT,
  cads            TEXT,
  assemblies      TEXT,
  models          TEXT,
  detail          TEXT,
  parameters      TEXT,
  tolerance       TEXT,
  diameterLength  TEXT,
  drawingLimit    TEXT,
  formulas        TEXT,
  extension       TEXT,
  sort            INTEGER UNSIGNED DEFAULT 0,
  status          INTEGER UNSIGNED DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at      DATETIME NOT NULL DEFAULT (datetime('now')),
  deleted_at      DATETIME
);
