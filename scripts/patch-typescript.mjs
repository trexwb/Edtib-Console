// typescript@7 起 package.json 的 exports 不再导出 "./lib/tsc" 子路径
// （物理文件 lib/tsc.js 仍存在），而 vue-tsc@3.x 的 resolveTscPath 以
// require.resolve('typescript/lib/tsc') 为默认入口，Node 严格遵循 exports
// 字段时会抛 ERR_PACKAGE_PATH_NOT_EXPORTED，导致 typecheck / build 无法运行。
// 这里在依赖安装后为 typescript 补回该导出，保证依赖重装后修复不丢失。
// [框架统一] 与 books 同一份脚本；当前 typescript 已锁定 ~6.0.3（无 exports 字段，
// 本脚本空转），保留它是为依赖升降级时自动兜底。
// （做法与 patch-vitebar.mjs 为 vite-plugin-vitebar 补 exports 条件一致。）
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgTarget = resolve(dirname(fileURLToPath(import.meta.url)), '../node_modules/typescript/package.json')

if (!existsSync(pkgTarget)) {
  console.warn('[patch-typescript] 跳过：未找到 typescript（请先安装依赖）')
} else {
  const pkg = JSON.parse(readFileSync(pkgTarget, 'utf8'))
  const tscFile = resolve(dirname(pkgTarget), 'lib/tsc.js')
  if (pkg.exports && !pkg.exports['./lib/tsc'] && existsSync(tscFile)) {
    pkg.exports['./lib/tsc'] = './lib/tsc.js'
    writeFileSync(pkgTarget, `${JSON.stringify(pkg, null, 2)}\n`)
    console.log('[patch-typescript] 已为 typescript 补充 exports["./lib/tsc"]（vue-tsc 兼容 TS7 exports）')
  } else if (pkg.exports && pkg.exports['./lib/tsc']) {
    console.log('[patch-typescript] typescript exports 条件已满足，无需处理')
  } else if (!pkg.exports) {
    // TS <= 6 无 exports 字段，子路径天然可解析，无需处理
    console.log('[patch-typescript] typescript 无 exports 字段（TS<=6），无需处理')
  } else {
    console.warn('[patch-typescript] 跳过：typescript 包结构不符合预期')
  }
}
