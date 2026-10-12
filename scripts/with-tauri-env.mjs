/* ═══════════════════════════════════════════════════════════════════
   Edtib 桌面端 — tauri:dev 环境变量注入包装器
   ───────────────────────────────────────────────────────────────────
   [框架统一] books / console 共用同一份脚本，改动需双侧同步。

   背景：`npm run tauri:dev` 需要两套口径同时成立——
     · 渲染层（vite）：由 tauri.conf.json 的 beforeDevCommand（`npm run dev:test`）
       以 `vite --mode test` 加载 `.env.test`，其中的 VITE_APP_* 是「本地链路对」
       （渲染层 ↔ tauri http 服务之间的验签/加解密密钥）；
     · Rust 侧（tauri 进程）：不读 vite 的 env 文件，只认进程环境变量与密钥文件，
       出站调用后端网关时使用 TAURI_APP_* + TAURI_APP_BASE_URL。
   本包装器负责把 `.env.test` 的内容注入 tauri dev 进程，并完成一件必须做的事：
   把 `.env.test` 里的 VITE_APP_ID / VITE_APP_SECRET / VITE_APP_IV 映射为
   TAURI_LINK_ID / TAURI_LINK_SECRET / TAURI_LINK_IV——这两组必须是同一对，
   否则 Rust 侧本地验签直接 4016000305（密钥缺失时按「失败关闭」返回 500）。

   规则：
     1) 只注入 `TAURI_*` / `EDTIB_*` / `NODE_ENV`，以及上面那组 VITE_APP_* → TAURI_LINK_* 映射；
        其余 VITE_* 属于渲染层，不进 Rust 进程（防止密钥口径混淆）。
     2) 进程环境已有的变量优先于文件（便于临时覆盖：`TAURI_APP_BASE_URL=… npm run tauri:dev`）。
     3) 环境由「当前生效的环境文件」决定，Rust 侧不再区分 dev/prod 两套键位，
        这里固定 NODE_ENV=development；Rust 也已删除内置网关地址兜底，
        出站地址只能来自 TAURI_APP_BASE_URL 或本地 secrets 表（正式包再受白名单约束）。
     3.1) 因此禁止用正式环境文件跑 tauri:dev：确需正式口径联调时显式
        EDTIB_TAURI_ALLOW_PROD_ENV=1，否则本脚本直接失败退出。
     3.2) 脚本层只是第一道；Rust 侧 `proxy::request::pin_origin` 在 development 构建
        里同样拒绝把请求带到正式网关（gateway.edtib.com），除非进程环境给出
        EDTIB_ALLOW_PROD_EGRESS=1。两道口径一致：跨环境必须显式声明，不静默放行。
     4) 打包产物不走本脚本：运行时密钥来自 <AppData>/{console,books}.env。
   ═══════════════════════════════════════════════════════════════════ */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ENV_NAME = process.env.EDTIB_TAURI_ENV || '.env.test'
const ENV_FILE = path.join(ROOT, ENV_NAME)

// 渲染层由 beforeDevCommand 固定为 `vite --mode test`（.env.test 的本地链路对），
// 若这里改读正式环境文件，Rust 会拿着正式出站凭证跑在测试渲染层上：
// 链路密钥不一致时只是 4016000305，一致时则是「开发实例直连正式网关」的事故。
if (/production|prod\b|^\.env\.stage/.test(ENV_NAME) && process.env.EDTIB_TAURI_ALLOW_PROD_ENV !== '1') {
  console.error(`[with-tauri-env] 拒绝以 ${ENV_NAME} 启动 tauri:dev（渲染层固定使用 .env.test 口径）`)
  console.error('[with-tauri-env] 确需以正式口径联调：EDTIB_TAURI_ALLOW_PROD_ENV=1 npm run tauri:dev')
  process.exit(1)
}

// 渲染层本地链路七键 → Rust 侧 TAURI_LINK_*（口径必须一致）
const LINK_MAP = {
  VITE_APP_ID: 'TAURI_LINK_ID',
  VITE_APP_SECRET: 'TAURI_LINK_SECRET',
  VITE_APP_IV: 'TAURI_LINK_IV',
}

if (!existsSync(ENV_FILE)) {
  console.error(`[with-tauri-env] 缺少环境文件 ${ENV_NAME}（应位于项目根目录）`)
  console.error('[with-tauri-env] 该文件承载 tauri:dev 口径：渲染层 VITE_APP_*（本地链路对）+ TAURI_APP_*（出站网关凭证）')
  console.error('[with-tauri-env] 模板见 .env.example，可从 .env.development 复制后按上述口径改键')
  process.exit(1)
}

// 极简 dotenv：支持 export 前缀 / 引号值 / 注释；与 Rust 侧 config::parse_env_file 同口径
const parsed = {}
for (const raw of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
  const line = raw.trim()
  if (!line || line.startsWith('#') || line.startsWith('alias ')) continue
  const matched = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
  if (!matched) continue
  let value = matched[2]
  if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
    value = value.slice(1, -1)
  }
  parsed[matched[1]] = value
}

const env = { ...process.env }
const injected = []
const take = (key, value, reason) => {
  if (key in env) return
  env[key] = value
  injected.push(`${key}${reason ? `(${reason})` : ''}`)
}

for (const [key, value] of Object.entries(parsed)) {
  if (key.startsWith('TAURI_') || key.startsWith('EDTIB_') || key === 'NODE_ENV') take(key, value)
}
for (const [from, to] of Object.entries(LINK_MAP)) {
  if (parsed[from]) take(to, parsed[from], `← ${from}`)
}
if (!('NODE_ENV' in env)) env.NODE_ENV = 'development'

// 提前校验：本地链路两端的密钥必须是同一对。
// 渲染层的 VITE_APP_* 与 Rust 的 TAURI_LINK_* 一旦不一致（含 shell 覆盖、文件里两套键都写），
// 每一次转发都会以 4016000305 失败，但报错出现在接口层、很难归因，所以在这里直接失败退出。
const LINK_SOURCE = {
  TAURI_LINK_ID: 'VITE_APP_ID',
  TAURI_LINK_SECRET: 'VITE_APP_SECRET',
  TAURI_LINK_IV: 'VITE_APP_IV',
}
const LINK_LENGTH = { TAURI_LINK_ID: null, TAURI_LINK_SECRET: 32, TAURI_LINK_IV: 16 }
const problems = []
for (const [key, from] of Object.entries(LINK_SOURCE)) {
  const actual = env[key] || ''
  const expected = parsed[from] || ''
  if (!actual) problems.push(`${key} 缺失（应由 ${from} 映射，或显式配置）`)
  else if (expected && actual !== expected) problems.push(`${key} 与 ${from} 不一致（本地链路两端必须同钥）`)
  else if (LINK_LENGTH[key] !== null && actual.length !== LINK_LENGTH[key])
    problems.push(`${key} 长度 ${actual.length}，应为 ${LINK_LENGTH[key]}`)
}
if (problems.length) {
  console.error(`[with-tauri-env] ${ENV_NAME} 本地链路配置不可用：`)
  for (const problem of problems) console.error(`[with-tauri-env]   · ${problem}`)
  console.error('[with-tauri-env] 修正后重跑 npm run tauri:dev；模板见 .env.example')
  process.exit(1)
}

if (!(env.TAURI_APP_BASE_URL || '').trim()) {
  console.warn(
    `[with-tauri-env] 未配置 TAURI_APP_BASE_URL：出站地址将由本地 secrets 表 app_url 兜底；` +
      `正式包只接受自有网关白名单 origin，兜底缺失时 proxy_request 会明确报错`
  )
}

const cmd = process.argv.slice(2)
if (!cmd.length) {
  console.error('[with-tauri-env] 用法: node scripts/with-tauri-env.mjs <命令…>')
  process.exit(1)
}

console.log(
  `[with-tauri-env] ${ENV_NAME} → 注入 ${injected.length} 项：${injected.join(', ')}；` +
    `出站网关 ${env.TAURI_APP_BASE_URL || '(未配置，由本地 secrets 表 app_url 兜底)'}`
)

const result = spawnSync(cmd[0], cmd.slice(1), {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
})
if (result.error) {
  console.error(`[with-tauri-env] 启动失败: ${result.error.message}`)
  process.exit(1)
}
process.exit(result.status ?? 1)
