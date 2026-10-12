/* ═══════════════════════════════════════════════════════════════════
   Edtib 桌面端 — Web 产物密钥扫描（console / books 共用，改动需双侧同步）
   ───────────────────────────────────────────────────────────────────
   目的：把「正式凭证没有泄漏进 Web 资源」变成一条可重复执行的机器校验，
   而不是靠人眼看 .env 字段名前缀推断。

   校验两件事：
     1) 任何环境的 TAURI_APP_*（出站网关凭证）都不得出现在 Web 产物里。
        Vite 默认 envPrefix='VITE_' 决定了这件事应当成立；本脚本是对该
        假设的直接证伪手段——字段名改前缀不等于不进产物，必须扫字节。
     2) 跨环境泄漏：生产产物里不得出现 .env.development / .env.test 的密钥
        （等价「测试模式不得回退使用正式凭证」的反向检查）。

   注意：本地链路密钥（当前生效环境文件的 VITE_APP_*）按设计会被编译进渲染层
   产物——Rust 侧要能验通前端请求，前端就必须持有同一对密钥。命中它不代表
   出站网关凭证泄漏；脚本对它只报「按设计存在」，不报 FAIL。
   本脚本不打印任何密钥明文，只输出 命中的环境文件 + 键名 + 文件清单。
   ═══════════════════════════════════════════════════════════════════ */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argIdx = process.argv.indexOf('--dir')
const DIST = path.resolve(ROOT, argIdx > -1 ? process.argv[argIdx + 1] : 'dist')

const ENV_FILES = ['.env', '.env.development', '.env.test', '.env.production']
// 扫描目标环境：默认为 production 产物；`--mode test` 用于核对测试口径构建
const modeIdx = process.argv.indexOf('--mode')
const MODE = modeIdx > -1 ? process.argv[modeIdx + 1] : 'production'
const ACTIVE_ENV = `.env.${MODE}`
// 出站网关凭证：绝对不允许进入 Web 产物
const GATEWAY_KEYS = ['TAURI_APP_ID', 'TAURI_APP_SECRET', 'TAURI_APP_IV']
// 本地链路凭证：按设计存在于渲染层产物（Rust 侧要用同一对密钥验签/加解密前端请求），
// 因此只做归因；唯一需要报警的是「其它环境用了不同的链路密钥」
const LINK_KEYS = ['VITE_APP_ID', 'VITE_APP_SECRET', 'VITE_APP_IV', 'TAURI_LINK_ID', 'TAURI_LINK_SECRET', 'TAURI_LINK_IV']
// 地址类：命中只说明产物里写死了目标域名，单独归为提示
const URL_KEYS = ['TAURI_APP_BASE_URL', 'VITE_APP_BASE_URL', 'VITE_API_URL', 'VITE_BASE_URL']

function parseEnv(file) {
  const out = {}
  if (!existsSync(file)) return out
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const matched = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!matched) continue
    let value = matched[2]
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1)
    }
    out[matched[1]] = value
  }
  return out
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const target = path.join(dir, name)
    if (statSync(target).isDirectory()) walk(target, acc)
    else acc.push(target)
  }
  return acc
}

if (!existsSync(DIST)) {
  console.error(`[scan-dist-secret] 产物目录不存在：${path.relative(ROOT, DIST)}（先执行对应构建）`)
  process.exit(1)
}

// 生效环境文件缺失时明确失败：此时产物里的密钥无法追溯来源，静默通过等于放弃校验
if (!existsSync(path.join(ROOT, ACTIVE_ENV))) {
  console.error(`[scan-dist-secret] 缺少生效环境文件 ${ACTIVE_ENV}（模式=${MODE}）。请先按模板补齐，再执行构建/扫描`)
  process.exit(1)
}

const activeValues = parseEnv(path.join(ROOT, ACTIVE_ENV))
// 同一字面量常常同时出现在多个环境文件里（例如本地链路键在 test/prod 复用）：
// 按 (键, 值) 聚合来源文件，避免把「同一把密钥」误报成「别的环境的密钥泄漏」
const candidates = []
const byId = new Map()
for (const envName of ENV_FILES) {
  const parsed = parseEnv(path.join(ROOT, envName))
  for (const key of [...GATEWAY_KEYS, ...LINK_KEYS, ...URL_KEYS]) {
    const value = (parsed[key] || '').trim()
    // 过短的值（占位空串、1-2 位测试值）会大量误报，跳过
    if (value.length < 6) continue
    const id = `${key}=${value}`
    const existing = byId.get(id)
    if (existing) {
      existing.envNames.push(envName)
      continue
    }
    const candidate = { key, value, envNames: [envName] }
    byId.set(id, candidate)
    candidates.push(candidate)
  }
}

const files = walk(DIST)
const hits = []
for (const file of files) {
  // latin1 保证任意字节可原样映射为字符，二进制资源里的 ASCII 密钥同样可被检出
  const text = readFileSync(file).toString('latin1')
  for (const c of candidates) {
    if (text.includes(c.value)) hits.push({ ...c, file: path.relative(DIST, file) })
  }
}

const report = (predicate, label) => {
  const selected = hits.filter(predicate)
  const grouped = new Map()
  for (const h of selected) {
    const key = `${h.key}〔${h.envNames.join(' / ')}〕`
    if (!grouped.has(key)) grouped.set(key, new Set())
    grouped.get(key).add(h.file)
  }
  console.log(`\n[${label}] 命中 ${selected.length} 处 / ${grouped.size} 组`)
  for (const [key, set] of [...grouped].sort((a, b) => a[0].localeCompare(b[0]))) {
    const listed = [...set].slice(0, 5).join(', ')
    console.log(`  ${key}${set.size > 5 ? ` (+${set.size - 5} 个文件)` : ''}${listed ? `  → ${listed}` : ''}`)
  }
  return selected
}

// 链路密钥是否属于「本环境自己的密钥」：命中值等于当前生效环境文件里
// 任一链路键的值即为一致，否则说明产物里混入了另一套链路的密钥
const isOwnLinkKey = h =>
  LINK_KEYS.some(key => {
    const active = (activeValues[key] || '').trim()
    return active.length >= 6 && active === h.value
  })

console.log(`[scan-dist-secret] 目录=${path.relative(ROOT, DIST)} 模式=${MODE}(${ACTIVE_ENV}) 文件=${files.length} 待检密钥=${candidates.length}`)
const gateway = report(h => GATEWAY_KEYS.includes(h.key), 'FAIL 出站网关凭证 TAURI_APP_*')
const foreignLink = report(h => LINK_KEYS.includes(h.key) && !isOwnLinkKey(h), `FAIL 非 ${MODE} 链路的密钥`)
report(h => LINK_KEYS.includes(h.key) && isOwnLinkKey(h), '按设计 本地链路密钥（渲染层与 Rust 共用）')
report(h => URL_KEYS.includes(h.key), '提示 目标地址字面量')

// 隔离提示：同一把本地链路密钥被多个环境文件复用（test/prod 无法区分），
// 单独列出，供人工判断是否需要按环境拆键
const shared = [...new Set(hits.filter(h => LINK_KEYS.includes(h.key) && h.envNames.length > 1).map(h => `${h.key}〔${h.envNames.join(' / ')}〕`))]
console.log(`\n[提示 跨环境复用的链路密钥] ${shared.length} 组`)
for (const item of shared.sort()) console.log(`  ${item}`)

if (gateway.length || foreignLink.length) {
  console.error('\n[scan-dist-secret] 结论：Web 产物存在凭证泄漏，构建不可发布')
  process.exit(1)
}
console.log('\n[scan-dist-secret] 结论：Web 产物未检出任一出站网关凭证，也无其它环境的链路密钥')
