#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   Edtib 桌面端 — 版本号一致性校验脚本
   ───────────────────────────────────────────────────────────────────
   [框架统一] 与 books 为同一份代码（差异一律来自 package.json name 等派生值），
   改动需双侧同步。
   ───────────────────────────────────────────────────────────────────
   用法：node scripts/check-version.mjs
   以 package.json 的 version 为基准，比对桌面端其余版本号，
   全部一致退出 0，任一不一致列出差异并退出 1（可挂 pre-commit / CI）。
   覆盖：tauri.conf.json / package-lock.json / src-tauri/Cargo.toml
   ═══════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const exists = (f) => fs.existsSync(path.join(ROOT, f));
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const readJson = (f) => JSON.parse(read(f));

const base = readJson('package.json').version; // 真源 1：npm 版本
const VV = 'v' + base;

const checks = [];
checks.push([
  'src-tauri/tauri.conf.json（真源）',
  exists('src-tauri/tauri.conf.json') ? readJson('src-tauri/tauri.conf.json').version : undefined,
  base,
]);
const lock = readJson('package-lock.json');
checks.push(['package-lock.json 顶层', lock.version, base]);
checks.push(['package-lock.json packages[""]', lock.packages && lock.packages[''] && lock.packages[''].version, base]);
checks.push([
  'src-tauri/Cargo.toml',
  exists('src-tauri/Cargo.toml') ? /^version = "(\d+\.\d+\.\d+)"$/m.exec(read('src-tauri/Cargo.toml'))?.[1] : undefined,
  base,
]);

let bad = 0;
for (const [label, actual, expect] of checks) {
  const ok = actual === expect;
  if (!ok) bad++;
  console.log(`${ok ? '✅' : '❌'} ${label}: ${actual ?? '(未找到)'} ${ok ? '' : `≠ ${expect}`}`);
}

if (bad === 0) {
  console.log(`\n全部 ${checks.length} 处桌面端版本号一致（${VV}）`);
  process.exit(0);
} else {
  console.log(`\n发现 ${bad} 处不一致！请运行: npm run version:set <x.y.z> 或 npm run version:patch`);
  process.exit(1);
}
