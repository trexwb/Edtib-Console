/* ═══════════════════════════════════════════════════════════════════
   Edtib 桌面端 — 安装包/二进制密钥扫描（console / books 共用，改动需双侧同步）
   ─────────────────────────────────════════════════════════════════════
   与 scan-dist-secret.mjs 的分工：
     · scan-dist-secret.mjs  只扫 Web 产物目录（dist），判「出站网关凭证有没有
       被编译进渲染层资源」；
     · 本脚本  扫 Tauri 打包目录（src-tauri/target/release/bundle），覆盖
       可执行二进制、内嵌前端资源、Info.plist、updater 签名等所有落盘产物，
       判「拿到安装包的人能不能直接抽出凭证」。

   判定口径：
     1) 出站网关凭证（TAURI_APP_ID/SECRET/IV）出现在任何产物字节里 → FAIL。
        这些值只应从 <AppData>/{console,books}.env 或本地 secrets 表在运行期读入，
        不得由 option_env!/env! 编译进二进制，也不得作为 bundle.resources 打包。
     2) 本地链路凭证（VITE_APP_* / TAURI_LINK_*）出现在内嵌前端资源里 → 已知且
        被接受的设计（Rust 要用同一对密钥验签前端请求），只归因、不 FAIL；
        出现在 Rust 二进制里 → WARN，说明存在把密钥编译进二进制的用法。
     3) 任一非当前构建模式的链路密钥 → FAIL（跨环境污染）。
   本脚本不打印密钥明文，只输出「哪个环境的哪个键命中在哪个文件」。

   注意：.dmg/.app.tar.gz 是压缩容器，明文扫描无法穿透；需要先挂载/解压再扫，
   本脚本扫的是 bundle 下已展开的 .app 与未压缩产物，并对压缩容器单独提示。
   ═══════════════════════════════════════════════════════════════════ */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i > -1 ? process.argv[i + 1] : fallback
}
const BUNDLE = path.resolve(ROOT, argv('--dir', 'src-tauri/target/release/bundle'))
const MODE = argv('--mode', 'production')
const ACTIVE_ENV = `.env.${MODE}`

const ENV_FILES = ['.env', '.env.development', '.env.test', '.env.production']
const GATEWAY_KEYS = ['TAURI_APP_ID', 'TAURI_APP_SECRET', 'TAURI_APP_IV']
const LINK_KEYS = ['VITE_APP_ID', 'VITE_APP_SECRET', 'VITE_APP_IV', 'TAURI_LINK_ID', 'TAURI_LINK_SECRET', 'TAURI_LINK_IV']
const URL_KEYS = ['TAURI_APP_BASE_URL', 'VITE_APP_BASE_URL', 'VITE_ASSETS_BASE_URL']
// 内嵌前端资源目录特征（命中这些路径的文件视为「渲染层资源」）
const isRendererAsset = file => /\/(Resources|dist)\/.*(assets|js|css)|\.html?$|webview/i.test(file)
const isBinary = file => /\/MacOS\/[^.]+$|\.dylib$|\.so$/.test(file)

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
  if (!existsSync(dir)) return acc
  for (const name of readdirSync(dir)) {
    const target = path.join(dir, name)
    let st = null
    try {
      st = statSync(target)
    } catch {
      continue
    }
    if (st.isDirectory()) walk(target, acc)
    else acc.push(target)
  }
  return acc
}

if (!existsSync(BUNDLE)) {
  console.error(`[scan-installer-secret] 打包目录不存在：${path.relative(ROOT, BUNDLE)}（先执行 npm run tauri:build）`)
  process.exit(1)
}

// 生效环境文件缺失时明确失败：此时产物里的密钥无法追溯来源，静默通过等于放弃校验
if (!existsSync(path.join(ROOT, ACTIVE_ENV))) {
  console.error(`[scan-installer-secret] 缺少生效环境文件 ${ACTIVE_ENV}（模式=${MODE}）。请先按模板补齐，再执行构建/扫描`)
  process.exit(1)
}

const activeValues = parseEnv(path.join(ROOT, ACTIVE_ENV))
const candidates = []
const seen = new Set()
for (const envName of ENV_FILES) {
  const parsed = parseEnv(path.join(ROOT, envName))
  for (const key of [...GATEWAY_KEYS, ...LINK_KEYS, ...URL_KEYS]) {
    const value = (parsed[key] || '').trim()
    if (value.length < 6) continue
    const id = `${key}=${value}`
    if (seen.has(id)) continue
    seen.add(id)
    candidates.push({ envName, key, value })
  }
}

const files = walk(BUNDLE)
const archives = files.filter(f => /\.(dmg|zip|gz|tar|xz)$/.test(f))
const plain = files.filter(f => !/\.(dmg|zip|gz|tar|xz)$/.test(f))

// 陈旧产物检测：源码比打包结果新时，本次扫描描述的是「上一次构建」而不是当前代码，
// 必须显式提示，否则扫描通过会被误读成当前源码安全。
const newestMtime = list => {
  let newest = 0
  for (const f of list) {
    try {
      newest = Math.max(newest, statSync(f).mtimeMs)
    } catch {
      /* 忽略无法 stat 的文件 */
    }
  }
  return newest
}
const bundleNewest = newestMtime(files)
const sourceNewest = newestMtime(walk(path.join(ROOT, 'src-tauri/src')).concat(ENV_FILES.map(f => path.join(ROOT, f)).filter(existsSync)))
if (sourceNewest > bundleNewest) {
  console.log(
    `[WARN 产物陈旧] 源码/环境文件比 bundle 下最新产物更新（bundle=${new Date(bundleNewest).toISOString()} ` +
      `源码=${new Date(sourceNewest).toISOString()}）：本次扫描描述的是上一次构建，需重新 tauri:build 后再扫`
  )
}

const hits = []
for (const file of plain) {
  let text
  try {
    // latin1 原样映射字节，二进制里的 ASCII 字面量同样可被检出
    text = readFileSync(file).toString('latin1')
  } catch {
    continue
  }
  for (const c of candidates) {
    if (text.includes(c.value)) hits.push({ ...c, file: path.relative(BUNDLE, file) })
  }
}

const isOwnLinkKey = h =>
  LINK_KEYS.some(key => {
    const active = (activeValues[key] || '').trim()
    return active.length >= 6 && active === h.value
  })

const report = (predicate, label) => {
  const selected = hits.filter(predicate)
  const grouped = new Map()
  for (const h of selected) {
    const id = `${h.envName} → ${h.key}`
    if (!grouped.has(id)) grouped.set(id, new Set())
    grouped.get(id).add(h.file)
  }
  console.log(`\n[${label}] 命中 ${selected.length} 处 / ${grouped.size} 组`)
  for (const [id, set] of [...grouped].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${id}  ${[...set].slice(0, 4).join(', ')}${set.size > 4 ? ` (+${set.size - 4})` : ''}`)
  }
  return selected
}

console.log(
  `[scan-installer-secret] 目录=${path.relative(ROOT, BUNDLE)} 模式=${MODE}(${ACTIVE_ENV}) ` +
    `明文产物=${plain.length} 压缩容器=${archives.length} 待检密钥=${candidates.length}`
)
const gateway = report(h => GATEWAY_KEYS.includes(h.key), 'FAIL 出站网关凭证 TAURI_APP_*')
const foreignLink = report(h => LINK_KEYS.includes(h.key) && !isOwnLinkKey(h), `FAIL 非 ${MODE} 链路的密钥`)
const linkInRenderer = report(h => LINK_KEYS.includes(h.key) && isOwnLinkKey(h) && isRendererAsset(h.file), '已知 渲染层内嵌的本地链路密钥')
const linkInBinary = report(h => LINK_KEYS.includes(h.key) && isOwnLinkKey(h) && isBinary(h.file), 'WARN Rust 二进制内的本地链路密钥')
report(h => LINK_KEYS.includes(h.key) && isOwnLinkKey(h) && !isRendererAsset(h.file) && !isBinary(h.file), '提示 其它产物文件内的本地链路密钥')
report(h => URL_KEYS.includes(h.key), '提示 目标地址字面量')
if (archives.length) {
  console.log(`\n[未扫描 压缩容器] ${archives.slice(0, 4).map(f => path.relative(BUNDLE, f)).join(', ')}${archives.length > 4 ? ` (+${archives.length - 4})` : ''}`)
  console.log('  这些是压缩镜像，明文匹配无法穿透；需挂载后对其内部 .app 再跑一次本脚本')
}

const failed = gateway.length + foreignLink.length
if (failed) {
  console.error('\n[scan-installer-secret] 结论：安装包中存在可提取的服务端/跨环境凭证，不可分发')
  process.exit(1)
}
console.log(
  `\n[scan-installer-secret] 结论：安装包内未检出站网关凭证；渲染层仍持有本地链路密钥 ${linkInRenderer.length} 处` +
    `${linkInBinary.length ? `，Rust 二进制另有 ${linkInBinary.length} 处` : ''}（属已知设计，见交付说明的风险条目）`
)
