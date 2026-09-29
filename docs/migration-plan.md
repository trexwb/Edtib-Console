# console 迁移计划：Electron → Tauri v2（分批执行）

- 老项目（严格只读）：`/Users/wbtrex/website/localServer/node/edtib/client/console`
- 新项目：`/Users/wbtrex/website/localServer/node/edtib/console`
- 版本号：`package.json` / `src-tauri/tauri.conf.json` / `src-tauri/Cargo.toml` 统一 `1.0.0`
- 范围约束：不迁移历史数据、不做旧库兼容；本轮**不实现 outbox / 密钥改造**，保持老行为逻辑
- 覆盖度对照表：[`docs/migration-coverage.md`](./migration-coverage.md)——「老功能点 → 新实现位置」逐类核对结果与差异编号（D-01 ~ D-12），**本文档各节的实装状态以该表为准**
- 执行状态：**B0–B6 全部批次已执行完成**；仍存在的差异项与未闭环项见覆盖度表第三节

---

## 一、现状盘点（起点）

### 1.1 已完成（历史批次）

| 项 | 状态 | 位置 |
|---|---|---|
| 新项目 Tauri v2 骨架 | 完成 | `src-tauri/`（Cargo.toml、tauri.conf.json、capabilities、icons、build.rs） |
| 前端整体迁入 | 完成（文件级 diff 无缺失） | `src/`（Vue3 页面/路由/store/api/工具）、`public/`；详见覆盖度表 §2.1 |
| 迁移决策与收尾文档 | 完成 | `docs/electron-to-tauri.md`、`docs/offline-and-proxy-architecture.md`、`docs/migration-coverage.md`（覆盖度对照表） |
| 18 个 Knex 迁移 → 19 个 SQL | 完成（差异 D-01） | `src-tauri/migrations/0001_init.sql` ~ `0019_servers.sql` |
| Seeds 2 个等价逻辑 | 完成（差异 D-02） | `src-tauri/src/db/seed.rs`（随 `Database::open` 执行） |
| Rust 基础与业务模块 | 完成 | `js.rs`、`crypt.rs`（md5/sha256/aes-256-cbc）、`config.rs`、`response.rs`（Envelope）、`models/{mod,cast}.rs`（12 表注册表）、`db/{mod,query,seed}.rs`、`proxy/*`、`schedule/*`、`commands/*` |
| 前端请求层/桥接 | 请求层完成；`electronAPI` 未注入（D-05 / D-12） | `src/utils/request.ts`（已挂载 `tauriAdapter.ts`）、`src/utils/tauriAdapter.ts`、`src/utils/requestBridge.ts`（IPC 优先 + HTTP 兜底）、`src/types/electron.d.ts`（仅类型声明） |

### 1.2 本批任务范围与执行状态（全部批次已执行）

1. **Rust 命令层**：⚠️ 部分完成——`lib.rs` 已注册 6 个命令（`app_info` / `db_status` / `proxy_request` / `list_tasks` / `supported_tasks` / `run_task`）；老 `main.ts` 的 19 个 `ipcMain` 通道（db 7 + fs 7 + system 1 + 版本/更新 4）**尚无对应命令**（差异 D-05）
2. **Rust 代理层**：✅ 完成——`commands/proxy.rs` + `proxy/{middleware,request}.rs` + `response.rs`
3. **Rust 定时调度**：✅ 完成——`schedule/{mod,cron,tasks}.rs`，含 3 个内置任务；`script` handler 不迁移（D-06）
4. **Rust 自动更新**：⚠️ Rust 侧就绪（`tauri-plugin-updater` + `schedule::check_update`），前端 `update.vue` 入口仍走 `window.electronAPI`，待收敛（D-08）
5. **前端桥接层**：⚠️ axios Tauri adapter 已挂载（`request.ts` → `tauriAdapter.ts` → `invoke('proxy_request')`）；`window.electronAPI` 未注入（D-05 / D-12）
6. **基线校验与覆盖度对照表**：✅ 完成——`docs/migration-coverage.md`

---

## 二、老功能点全清单（迁移映射草案）

### 2.1 渲染层（Vue3，HTTP → invoke）

| 老实现 | 老行为 | 新实现位置 | 状态 |
|---|---|---|---|
| `web/src/**`（页面/路由/store/api/工具/i18n/静态资源） | 控制台全部界面与业务逻辑 | `src/**`、`public/**`（文件级 diff 无缺失：views 106 / router 4 / store 7 / api 22） | ✅ |
| `web/src/utils/request.ts` 请求拦截 | 生成 `App-Id/App-Nonce/App-Secret` 签名头、请求体 AES 加密、响应解密、401/402 跳登录 | `src/utils/request.ts`（拦截器未改） | ✅ |
| axios → `https://localhost.edtib.com:64580/api/*` | 经 Electron 本地 HTTPS 站点转发 gateway | `request.ts` 第 250 行挂载 `src/utils/tauriAdapter.ts` → `invoke('proxy_request')` | ✅ |
| `electron/src/preload.ts` | `contextBridge` 暴露 `electronAPI` | 未注入 `window.electronAPI`（`src/types/electron.d.ts` 仅类型声明；`views/settings/update.vue` 入口断链） | ❌ 未完成（D-05 / D-12） |

### 2.2 数据层（IPC）

| 老 IPC 通道 | 老行为 | 新实现 | 状态 |
|---|---|---|---|
| `db-find-all` (table, filters) | `model.getAll(filters)` | `commands/db.rs::db_find_all` | ❌ 未实现（D-05） |
| `db-get-list` (table, filters, order, limit, offset) | `model.getList(...)` → `{total, list}` | `db_get_list` | ❌ 未实现（D-05） |
| `db-find-one` (table, id) | `model.getRow({$primaryKey: id})` | `db_find_one` | ❌ 未实现（D-05） |
| `db-create` (table, data) | `model.create(data)`（支持数组=批量） | `db_create` | ❌ 未实现（D-05） |
| `db-update` (table, id, data) | `model.update({pk: id}, data)` | `db_update` | ❌ 未实现（D-05） |
| `db-delete` (table, id) | `model.delete({pk: id})` | `db_delete` | ❌ 未实现（D-05） |
| `db-bulk-create` (table, data) | 同 `create`（批量） | `db_bulk_create` | ❌ 未实现（D-05） |
| 表白名单 `ALLOWED_TABLES`（12 表） | 非白名单抛 `Table "x" is not in the allowed whitelist` | `models/mod.rs` 注册表 + 同文案错误 | ✅ |
| 查询能力底座 | `model/base.ts`（cast / 时间格式 / where hook） | `db/query.rs` + `models/cast.rs` + `js.rs` | ✅ |

### 2.3 文件系统 / 系统信息

| 老 IPC 通道 | 老行为 | 新实现 | 状态 |
|---|---|---|---|
| `fs-read-file` | `readFile(userData + path, 'utf-8')` | `commands/fs.rs::fs_read_file`（路径相对 AppData） | ❌ 未实现（D-05） |
| `fs-write-file` | 递归建目录 + utf-8 写入，返回绝对路径 | `fs_write_file` | ❌ 未实现（D-05） |
| `fs-delete-file` | `unlink` → `true/false` | `fs_delete_file`（加 AppData 越界防护，见 M6/D-09） | ❌ 未实现（D-05） |
| `fs-list-files` | `readdir` | `fs_list_files` | ❌ 未实现（D-05） |
| `fs-get-user-data-path` | `app.getPath('userData')` | `fs_get_user_data_path`（AppData，见 M4/D-07） | ❌ 未实现（D-05） |
| `fs-get-documents-path` | `app.getPath('documents')` | `fs_get_documents_path` | ❌ 未实现（D-05） |
| `fs-exists` | `access` → `true/false`（失败仍 code 200） | `fs_exists` | ❌ 未实现（D-05） |
| `system-get-info` | platform/arch/hostname/cpus/内存/versions | `commands/system.rs::system_get_info`（见 M7/D-09） | ❌ 未实现（D-05） |

> 说明：老 `main.ts` 的 db / fs / system 能力在新架构下由 Rust 侧直接操作（SQLite 不作渲染层缓存、文件读写由 Rust 完成），
> 本节「新实现」列的命令名保留为**规划口径**；当前未注册对应命令，前端 `requestBridge.ts` 的 IPC 分支不可达，统一走 HTTP 兜底（详见覆盖度表 §2.4）。

### 2.4 本地服务（Express + HTTPS 站点 → Rust 代理层）

| 老实现 | 老行为 | 新实现 | 状态 |
|---|---|---|---|
| `index.ts` HTTPS 服务 64580 + `/static` 静态 + SPA fallback | 托管渲染层页面 | Tauri `frontendDist` / `devUrl`（不再需要本地 HTTPS 端口，D-03） | ❌ 有意不迁移 |
| `route/middleware.ts#factory` | 注入 `handleSuccess/handleError` | `response.rs` Envelope 辅助 | ✅ |
| `route/middleware.ts#token` | 校验 `App-Id/App-Nonce/App-Secret`（含 nonce 格式、时间戳有效期 1800s、签名复算），错误码 4016000301/302/303/305/306 | `proxy/middleware.rs`（文案与错误码逐字对齐） | ✅ |
| `route/middleware.ts#response` | 统一信封 `{code,message,timestamp}`，data 存在时用 `appSecret/appIv` 加密为 `encryptedData` | `proxy/request.rs` 响应段 | ✅ |
| `controller/request.ts#requestMake` | 读 secrets 有效行取 app_url/app_id/app_secret/app_iv → 解 body → 重加密 → `x-sign`（排序 + sha256 + md5）→ axios 转发 → 解响应 → 信封 | `commands/proxy.rs::proxy_request`（已注册）+ `proxy/request.rs`（reqwest 转发） | ✅ |

### 2.5 定时调度（node-schedule → tokio）

| 老实现 | 老行为 | 新实现 | 状态 |
|---|---|---|---|
| `schedule/index.ts#handler` | 每 5s 轮询：enabled 任务按 `row.time`（cron）注册 3 类 job；无 enabled 则取消对应 job | `schedule/mod.rs` 轮询 + `schedule/cron.rs` 匹配器（兼容 6 段式） | ✅ |
| `handler.comment` | `execSync(命令)` | 受控 shell 执行（保留能力；种子中无该类任务） | ⚠️ 有意差异 |
| `handler.script` | `new Function(script)()`（任意 JS） | **不迁移**（D-06，日志告警跳过） | ❌ 不可迁移 |
| `handler.require` | 动态 `import(components/<name>.js)` | 白名单 `SUPPORTED_TASKS`（`heartbeatTask` / `updateTask` / `downCrtFileTask`） | ✅ |
| `components/heartbeatTask` | 读 secrets 有效行 → GET `{origin}/heartbeat` | `schedule::heartbeat`（`schedule/tasks.rs`） | ✅ |
| `components/downCrtFileTask` | 下载 static.edtib.com 的 cert/key，内容变化才写入 | `schedule::download_certificate`（目录见 M3/D-07） | ✅ |
| `components/updateTask` | `autoUpdater.checkForUpdatesAndNotify()` | `schedule::check_update`（tauri-plugin-updater） | ✅ |
| 调度状态查询 / 手动触发 | 老项目无对应 IPC | 新增 `list_tasks` / `supported_tasks` / `run_task`（已注册） | ➕ 新架构补充 |

### 2.6 自动更新（electron-updater → tauri-plugin-updater）

| 老实现 | 老行为 | 新实现 | 状态 |
|---|---|---|---|
| `initAutoUpdater` | 绑定 checking/available/not-available/error/download-progress/downloaded 事件 | 由 `tauri-plugin-updater` 承接；事件经 shim 映射回原回调名 | ⚠️ 事件映射未接入（D-08） |
| 启动检查 + `setInterval` 1h | 非 development 环境自动检查 | `schedule::check_update`（seeds 中 `检查更新` 任务，每小时） | ✅ |
| `get-app-version` | `"{versionAlias}-v{version}({versionTimer})"` | `app_info`（`package.version`）已注册；老拼接文案待补齐 | ⚠️ 差异（M2/D-08） |
| `check-update` | `checkForUpdatesAndNotify()`，失败弹原生对话框 | `schedule::check_update`；前端入口仍走 `window.electronAPI.checkUpdate()`（断链） | ❌ 未闭环（D-08） |
| `update-downloaded` | 原生对话框（重启应用 / 稍后再试）+ 通知渲染层 | 前端已有进度/按钮 UI（`views/settings/update.vue`）；原生对话框不迁移 | ⚠️ |
| `confirm-update` | `quitAndInstall()` | `tauri-plugin-updater` install（命令层待补） | ❌ 未闭环（D-05） |
| `restart-app` | `app.relaunch(); app.exit(0)` | `tauri-plugin-process` 的 `relaunch()`（前端 `update.vue` 该行目前为注释） | ⚠️ |

### 2.7 明确不迁移（外观/环境差异，非功能）

| 项 | 说明 |
|---|---|
| 启动闪屏 `assets/splash.html` | Tauri 启动即加载前端，闪屏为 Electron 产物 |
| 无边框窗口 `frame:false` / `autoHideMenuBar` / `ignore-certificate-errors` | 桌面外壳差异；Tauri 使用标准窗口 |
| 单实例锁 `requestSingleInstanceLock` | Tauri 内置单实例语义 |
| 窗口尺寸 1230×960 / 最小 1024×600 | 迁入 `tauri.conf.json` window 配置（B1 复核） |
| `.env.local` 的 `VITE_APP_SECRET_KEY` | 老代码中无任何引用（C-C1 已确认），不迁移 |
| Knex / sqlite3 原生模块 / electron-rebuild | 由 rusqlite(bundled) 取代 |

---

## 三、分批执行计划

> 每批结束即运行本批验收；任一批不通过不得进入下一批。

### B0 基线校验与差异清单（只读）—— ✅ 已完成

- 老 `web/` 全量 `src`、`public` 与新 `src`、`public` 做文件级比对：**无缺失文件**，仅新增 Tauri 适配文件（`utils/host.ts`、`utils/tauriAdapter.ts`、`vite-env.d.ts`）
- 老 `electron/src/**` 资产清单 vs 新 `src-tauri/src/**` 覆盖情况：见覆盖度表第二节逐类明细
- **产出**：`docs/migration-coverage.md`（原计划的 `docs/migration-baseline.md` 差异清单已合并入该文档，不单独出文件）

### B1 Rust 数据层对齐 —— ✅ 已完成

- 18 个 Knex 迁移 ↔ `migrations/*.sql` 一一对应（新增 `0001_init.sql`，见 D-01）；逐表映射见覆盖度表 §2.7
- `models/mod.rs` 12 表注册表与老 `electron/src/model/*.ts` 对应；`db/query.rs` 覆盖 `get_all / get_list / get_row / create / update / delete / bulk_create`
- **验收**：`cargo check` 通过；`cargo test`（`db::seed`）通过

### B2 Rust 命令层（IPC 等价）—— ⚠️ 部分完成

- 已注册 6 个命令：`app_info`、`db_status`、`proxy_request`、`list_tasks`、`supported_tasks`、`run_task`
- **未完成**：老 `main.ts` 19 个 `ipcMain` 通道（db 7 / fs 7 / system 1 / 更新 4）无对应命令（D-05）
- **验收**：`cargo check` 通过；命令清单 ↔ 老 IPC 对照表仍缺 19 项（待补）

### B3 代理层（Express → Rust）—— ✅ 已完成

- `crypt.rs` 支持 `iv:cipher` 随机 IV 与固定 IV 双格式加/解密（D-04）
- `commands/proxy.rs::proxy_request`：鉴权（5 类错误码与文案逐字对齐）→ body 解密/重加密 → `x-sign` 签名 → reqwest 转发 → 响应解密 → 信封
- **验收**：`cargo check` 通过；错误码与信封断言随实现内联

### B4 定时调度 + 自动更新 —— ✅ 已完成（更新入口待收敛）

- `schedule/mod.rs`：5s 轮询、cron 匹配器（兼容 6 段式）、3 个内置任务（`script` handler 不迁移，D-06）
- `tauri-plugin-updater` / `tauri-plugin-process` 已引入；`schedule::check_update` 承接更新检查
- **验收**：`cargo check` 通过；`cargo test`（`schedule::cron` 含 seeds 实际 cron 值）通过

### B5 前端桥接层（HTTP → invoke）—— ⚠️ 部分完成

- `src/utils/tauriAdapter.ts`：axios → `invoke('proxy_request')`，已挂载于 `request.ts` 第 250 行
- `src/utils/host.ts`：宿主判定（`isTauri` / `isElectron`）
- **未完成**：`window.electronAPI` 未注入（D-05 / D-12），`views/settings/update.vue` 的更新入口断链（D-08）
- **验收**：`npm run build`（含 `vue-tsc`）通过

### B6 全量验收与覆盖度对照表 —— ✅ 已完成

- `npm run build`、`cargo check`、`cargo test` 三项通过（`cargo check` 25 warnings）
- **产出**：`docs/migration-coverage.md`——「老功能点 → 新实现位置 → 状态 → 差异编号」逐类对照 + 未迁移/未闭环项清单（D-01 ~ D-12）
- 三处版本号复核为 `1.0.0`

---

## 四、已知差异与决策点（需用户知悉）

| # | 事项 | 处理方式 |
|---|---|---|
| **M1** | 老项目源码存在**加密格式不一致**：web 前端用「随机 IV + `iv:cipher`」，electron `cryptTool` 用「固定 IV + 纯 hex」，二者无法互通（老构建产物为旧版前端，故线上未暴露） | Rust 侧实现**双格式自适应**：解密自动识别两种格式，对外（前端）/对上游（网关）按 `iv:cipher` 输出。**不改密钥常量、不改签名算法**；如需 100% bug 级兼容（强制固定 IV）可回退 |
| **M2** | 更新事件名 / 版本号文案 | Rust 事件用 `update://available|not-available|progress|downloaded|error`，shim 映射回老回调名（`onUpdateAvailable` 等）；`get_app_version` 仍返回 `"{alias}-v{version}({timer})"`，alias/timer 取老值（`morning star` / `20250928`）集中于 `config.rs`；老原生对话框改为前端已有 UI 通知 |
| **M3** | 证书下载目录 | 老写入安装目录 `electron/certs/`；新写入 `AppData/certs/`（旧 HTTPS 站点已不存在，该目录仅存档） |
| **M4** | 用户数据目录 | Electron `userData` → Tauri `AppData`（`~/Library/Application Support/com.edtib.console`），语义等价、绝对路径不同；不迁移旧数据 |
| **M5** | 调度任务三类 handler | `require`（内置任务）等价迁移；`comment`（shell）等价迁移；`script`（任意 JS 求值）**不迁移**，仅日志告警跳过（Rust 无 JS 运行时，且属远程代码执行面） |
| **M6** | `fs-*` 路径 | 老实现允许 `../` 逃出 userData；新版解析后校验**必须落在 AppData 内**，越界返回错误信封（安全加固，属有意差异） |
| **M7** | `system-get-info` 的 `versions` | 老返回 node/chrome/electron；新返回 Tauri/WebView 版本（保持字段名以兼容类型），`n/a` 标注已移除的 Electron 字段 |
| **M8** | 网络超时 | 老本地代理 axios 无超时（express 设 30s）；新版 reqwest 设 30s 超时；前端 axios `timeout` 保持不变 |

### 4.1 与覆盖度表的编号对应

| 覆盖度表编号 | 事项 | 状态 |
|---|---|---|
| D-01 | 迁移文件 18 → 19（新增 `0001_init.sql`） | 有意差异 |
| D-02 | seeds 改由 `db/seed.rs` 运行时处理，幂等判据收敛为「业务表空」 | 有意差异 |
| D-03 | 本地 HTTP 服务与端口（64580 / localhost.edtib.com）取消 | 有意差异 |
| D-04 | 加密双格式自适应（随机 IV `iv:cipher` ↔ 固定 IV hex） | 有意差异（= M1） |
| **D-05** | **主进程 IPC 命令层未闭环**：db 7 / fs 7 / system 1 / 版本更新 4 共 19 个通道无对应命令 | **未完成，待补** |
| D-06 | `handler.script`（任意 JS 求值）不迁移 | 不可迁移（= M5） |
| D-07 | 证书目录 `electron/certs/` → `AppData/certs/`；userData → AppData | 有意差异（= M3 / M4） |
| **D-08** | 自动更新前端入口断链（`update.vue` 走 `window.electronAPI.*`） | **未闭环，待收敛** |
| D-09 | `fs-*` AppData 越界防护；`system-get-info.versions` 字段差异 | 有意差异（= M6 / M7） |
| D-10 | 闪屏 / 无边框窗口 / 菜单栏隐藏 / 忽略证书错误 | 不可迁移 |
| D-11 | SQLite 定位（`rusqlite` 业务库，不作渲染层缓存） | 有意差异（见 `offline-and-proxy-architecture.md` D1） |
| **D-12** | `preload` / `window.electronAPI` 未注入 | **未完成，与 D-05 同批收敛** |

---

## 五、风险与回滚

- **老项目全程只读**：任何写入仅发生在 `edtib/console` 内；老项目仅做读取与比对
- **分批可回退**：每批产物独立（Rust 模块 / 前端文件），失败时仅回退该批文件，不影响已完成批次
- **依赖新增**：仅 `sysinfo`（系统信息）、`reqwest`（HTTP 转发）等实现必需项；若离线不可拉取，改用系统命令实现并在文档注明
- **不做数据迁移**：新库由迁移脚本在 AppData 首启创建，与老库完全隔离
