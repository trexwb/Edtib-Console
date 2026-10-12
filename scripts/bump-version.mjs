#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   Edtib 桌面端（console）— 版本号统一更新脚本
   ───────────────────────────────────────────────────────────────────
   用法：
     node scripts/bump-version.mjs 1.0.8            # 更新全部桌面端版本号
     node scripts/bump-version.mjs 1.0.8 --dry-run # 只预览不写入
     node scripts/bump-version.mjs --patch         # 自动 +1 PATCH（AI 递增）
   覆盖位置（桌面端相关 4 处）：
     package.json / package-lock.json(顶层 + packages[""]) /
     src-tauri/tauri.conf.json / src-tauri/Cargo.toml
   规则：no git ops；MAJOR/MINOR 由用户决定（version:set <x.y.z>），
        PATCH 由 AI 自动递增（version:patch / --patch）。
   ═══════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const patch = args.includes('--patch');
const versionArg = args.find((a) => !a.startsWith('--'));

function currentVersion() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
}

function nextPatchVersion() {
  const cur = currentVersion();
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(cur);
  if (!m) {
    console.error(`当前 package.json version "${cur}" 不符合 x.y.z，无法自动递增 PATCH`);
    process.exit(1);
  }
  const [, ma, mi, pa] = m;
  return `${ma}.${mi}.${Number(pa) + 1}`;
}

let V;
if (patch) {
  if (versionArg) {
    console.error('--patch 不可与显式版本号同时使用');
    process.exit(1);
  }
  V = nextPatchVersion();
} else {
  if (!versionArg || !/^v?\d+\.\d+\.\d+$/.test(versionArg)) {
    console.error('用法: node scripts/bump-version.mjs <x.y.z | vx.y.z> [--dry-run] | --patch [--dry-run]');
    process.exit(1);
  }
  V = versionArg.replace(/^v/, '');
}
const VV = 'v' + V;

const results = [];

function patchJson(file, apply, label) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) {
    results.push(`⚠️  ${file}: 文件不存在，跳过`);
    return;
  }
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  const before = JSON.stringify(d);
  apply(d);
  const after = JSON.stringify(d);
  if (before === after) {
    results.push(`⚠️  ${file}: 未发生变化（${label}），跳过`);
    return;
  }
  if (!dryRun) fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
  results.push(`${dryRun ? '🔍' : '✅'} ${file}: ${label}`);
}

function patchText(file, regex, replace, label) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) {
    results.push(`⚠️  ${file}: 文件不存在，跳过`);
    return;
  }
  const raw = fs.readFileSync(p, 'utf8');
  const out = raw.replace(regex, replace);
  if (out === raw) {
    results.push(`⚠️  ${file}: 未匹配到版本号（${label}），跳过`);
    return;
  }
  if (!dryRun) fs.writeFileSync(p, out);
  results.push(`${dryRun ? '🔍' : '✅'} ${file}: ${label}`);
}

/* ── JSON 类 ────────────────────────────────────────────────────── */
patchJson('package.json', (d) => { d.version = V; }, `version -> ${V}`);
patchJson('package-lock.json', (d) => {
  d.version = V;
  if (d.packages && d.packages['']) d.packages[''].version = V;
}, `顶层 + packages[""] -> ${V}`);
patchJson('src-tauri/tauri.conf.json', (d) => { d.version = V; }, `version -> ${V}（打包产物版本）`);

/* ── 文本类 ─────────────────────────────────────────────────────── */
// 仅匹配 [package] 段下整行的 version = "x.y.z"（不会误伤依赖里的 version = "2"）
patchText('src-tauri/Cargo.toml', /^version = "\d+\.\d+\.\d+"$/m, `version = "${V}"`, `version -> ${V}（同步 tauri.conf.json）`);

console.log(results.join('\n'));
console.log(dryRun
  ? '\n[dry-run] 未写入任何文件'
  : `\n完成：桌面端版本号已统一为 ${VV}（请人工在更新日志中补充本次变更说明；本脚本 no git ops）`);
