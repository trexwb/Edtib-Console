/* ═══════════════════════════════════════════════════════════════════
   Edtib 桌面端 — 本地构建签名环境注入（tauri:build 包装器）
   ───────────────────────────────────────────────────────────────────
   [框架统一] books / console 共用同一份脚本：项目名一律从 package.json
   name 派生（edtib-books → EdtibBooks），禁止在本文件写死项目名。
   背景：bundle.createUpdaterArtifacts: true + 公钥内嵌，打包时 Tauri 要求
   签名私钥。CI 经 GitHub Secrets 注入（TAURI_SIGNING_PRIVATE_KEY）；本地
   未设置环境变量会报 "A public key has been found, but no private key"。
   本包装器规则：
     1) 已设置 TAURI_SIGNING_PRIVATE_KEY（CI 或手动内联）→ 原样透传
     2) 未设置 → 按 TAURI_SIGNING_PRIVATE_KEY_PATH（.env.local / 手动
        export）与 ~/.tauri/<PascalName>-updater.key 顺序找到私钥文件，
        读入为内联值；密码从同名 env 取 TAURI_SIGNING_PRIVATE_KEY_PASSWORD
     3) 都没有 → 原样透传并打印指引（由 Tauri 给出明确的缺钥报错）
   ⚠️ 关键事实：tauri build 的打包签名只认 TAURI_SIGNING_PRIVATE_KEY
   （值可以是私钥内容，也可以是指向私钥文件的路径，打包器会自动识别）；
   TAURI_SIGNING_PRIVATE_KEY_PATH 仅 `tauri signer` 子命令支持，
   打包器完全不读取——因此这里一律把私钥转换成内联形式再透传。
   ═══════════════════════════════════════════════════════════════════ */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// edtib-books → EdtibBooks（私钥与 ~/.tauri env 文件命名沿用该 Pascal 名）
const PASCAL_NAME = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  .name.split(/[-_]/)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join('')
const KEY_PATH = path.join(os.homedir(), '.tauri', `${PASCAL_NAME}-updater.key`)
const ENV_FILES = [
  path.join(ROOT, '.env.local'),                                   // 项目根（优先）
  path.join(os.homedir(), '.tauri', `${PASCAL_NAME}.env`),          // ~/.tauri 统一 env
]

// 解析极简 dotenv（支持 export 前缀 / 引号值 / 注释 / alias 行忽略）；
// 仅在变量未设置时写入，手动 export 的值优先
function loadEnvFile(file) {
  if (!existsSync(file)) return
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('alias ')) continue
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!m) continue
    const key = m[1]
    let val = m[2]
    if (val.length >= 2 && ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

ENV_FILES.forEach(loadEnvFile)

// 关键：统一转成内联 TAURI_SIGNING_PRIVATE_KEY 后透传——
// ① 打包签名只认该变量（_PATH 仅 tauri signer 子命令支持，打包器不读取）；
// ② CLI 中 --private-key 与 --private-key-path 互斥，同时设置会被拒绝。
if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
  const pathPtr = process.env.TAURI_SIGNING_PRIVATE_KEY_PATH
  const candidates = pathPtr ? [pathPtr, KEY_PATH] : [KEY_PATH]
  let injected = false
  for (const cand of candidates) {
    // ~ 前缀展开：Node 的 existsSync 不解析波浪号，不展开会静默跳过下游报缺钥
    const expanded = cand && cand.startsWith('~')
      ? path.join(os.homedir(), cand.slice(1))
      : cand
    if (!existsSync(expanded)) {
      if (cand === pathPtr) {
        console.warn(`[with-updater-key] 警告：TAURI_SIGNING_PRIVATE_KEY_PATH 指向的文件不存在：${expanded}`)
      }
      continue
    }
    try {
      process.env.TAURI_SIGNING_PRIVATE_KEY = readFileSync(expanded, 'utf8')
      const head = Buffer.from(
        process.env.TAURI_SIGNING_PRIVATE_KEY.split(/\r?\n/)[0].replace('untrusted comment: ', ''),
        'base64'
      ).toString('utf8')
      if (head.includes('encrypted')) {
        if (!process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
          console.warn('[with-updater-key] 警告：私钥为加密态但未提供密码，签名将失败（检查 env 的 PASSWORD）')
        }
      } else if (!('TAURI_SIGNING_PRIVATE_KEY_PASSWORD' in process.env)) {
        // 无密码密钥也必须显式置空值：未设置时 CLI 在无 TTY 环境会尝试交互式
        // 询问密码并以 "Device not configured (os error 6)" 失败
        process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ''
      }
      console.log('[with-updater-key] 已注入内联签名私钥（来自', path.basename(expanded) + '）')
      injected = true
      break
    } catch (e) {
      console.warn('[with-updater-key] 读取私钥失败:', e && e.message)
    }
  }
  if (!injected) {
    console.warn(
      '[with-updater-key] 未找到可用私钥。tauri build 只认 TAURI_SIGNING_PRIVATE_KEY' +
      '（内容或私钥文件路径），不读 TAURI_SIGNING_PRIVATE_KEY_PATH；' +
      '请使用 npm run tauri:build 走本包装器，或自行 export TAURI_SIGNING_PRIVATE_KEY'
    )
  }
}
// 互斥规避：内联与路径不可同时存在
delete process.env.TAURI_SIGNING_PRIVATE_KEY_PATH

const cmd = process.argv.slice(2)
if (!cmd.length) {
  console.error('[with-updater-key] 用法: node scripts/with-updater-key.mjs <命令…>')
  process.exit(1)
}
const result = spawnSync(cmd[0], cmd.slice(1), {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})
process.exit(result.status ?? 1)
