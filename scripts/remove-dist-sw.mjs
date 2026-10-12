/* ═══════════════════════════════════════════════════════════════════
   EDTIB 桌面端（Tauri）SW 清理 —— tauri build 专用后处理
   ───────────────────────────────────────────────────────────────────
   桌面版前端资源经 Tauri 资源协议（http://tauri.localhost）提供；
   vite-plugin-pwa 在生产构建会注入 sw.js / registerSW.js / workbox-*.js
   并注册 Service Worker，而 Tauri webview 不支持该 SW 模式，残留的注册
   可拦截首屏导致白屏。浏览器版（web 部署）不受影响：本脚本仅在
   tauri.conf.json 的 beforeBuildCommand 链中调用。
   同时：TAURI_BUILD 模式下已跳过 PWA 插件，这里做兜底清理以防遗漏。
   ═══════════════════════════════════════════════════════════════════ */
import { existsSync, readdirSync, unlinkSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

if (!existsSync(dist)) {
  console.log('[remove-dist-sw] dist 目录不存在，跳过清理')
  process.exit(0)
}

// 桌面端不应出现的 PWA/SW 产物
const removeNames = new Set(['sw.js', 'sw.js.map', 'registerSW.js', 'registerSW.js.map'])
const removePrefixes = ['workbox-']

let removed = 0
for (const name of readdirSync(dist)) {
  const full = path.join(dist, name)
  if (!statSync(full).isFile()) continue
  const shouldRemove =
    removeNames.has(name) || removePrefixes.some((p) => name.startsWith(p))
  if (shouldRemove) {
    try {
      unlinkSync(full)
      removed++
      console.log(`[remove-dist-sw] 已移除 ${name}`)
    } catch (e) {
      console.warn(`[remove-dist-sw] 移除 ${name} 失败:`, e && e.message)
    }
  }
}

if (removed === 0) console.log('[remove-dist-sw] 未发现需清理的 SW/PWA 产物')
process.exit(0)
