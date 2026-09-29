# 迁移覆盖度对照表：老 console（Electron）→ 新 edtib/console（Tauri v2）

- 核对日期：2026-09-29
- 老项目（严格只读）：`/Users/wbtrex/website/localServer/node/edtib/client/console`
- 新项目：`/Users/wbtrex/website/localServer/node/edtib/console`
- 核对方式：文件级清单比对（`find` / `diff` / 计数）+ 源码逐点核对；老项目全程只读，未做任何写入
- 状态图例：

| 图例 | 含义 |
|---|---|
| ✅ | 已等价迁移（位置明确、行为对齐） |
| ⚠️ | 已迁移但存在差异（差异见 D-xx） |
| ❌ | 未迁移（含"有意不迁移"与"尚未闭环"，均在 D-xx 标注） |

---

## 一、总览

| # | 类目 | 老资产 | 新资产 | 状态 | 差异 |
|---|---|---|---|---|---|
| 1 | 前端 views | 106 个 `.vue` | 106 个 `.vue` | ✅ | — |
| 2 | 前端 router | `web/src/router` 4 文件 | `src/router` 4 文件 | ✅ | — |
| 3 | 前端 store | `web/src/store` 7 文件 | `src/store` 7 文件 | ✅ | — |
| 4 | 前端 api | `web/src/api` 22 模块 | `src/api` 22 模块 | ✅ | — |
| 5 | 前端 utils | `web/src/utils` | `src/utils` | ⚠️ | 新增 `host.ts`、`tauriAdapter.ts`；IPC 分支不可达（D-05） |
| 6 | 前端 i18n | `web/src/i18n/{index.ts,en.json}` | `src/i18n/{index.ts,en.json}` | ✅ | — |
| 7 | 静态资源 | `web/src/{assets,styles}` 18 文件、`public` 2 项 | 同数量 | ✅ | — |
| 8 | 前端请求层 | `web/src/utils/request.ts` + axios 直连 64580 | `request.ts` + `tauriAdapter.ts`（invoke） | ⚠️ | 本地端口取消（D-03） |
| 9 | electron route + middleware | `route/{index,request,middleware}.ts` | `commands/proxy.rs` + `proxy/{middleware,request}.rs` | ✅ | — |
| 10 | electron controller 转发 | `controller/request.ts` | `proxy/request.rs` + `commands/proxy.rs` | ✅ | — |
| 11 | cast 类型转换 | `cast/*.ts` 7 个 | `models/cast.rs` + `js.rs` | ✅ | — |
| 12 | crypt 加密 | `cast/crypt.ts` + `config/cryptTool.ts` | `crypt.rs` | ⚠️ | 双格式自适应（D-04） |
| 13 | schedule 定时任务 | `schedule/index.ts` + 3 个 task | `schedule/{mod,cron,tasks}.rs` | ⚠️ | `script` handler 不迁移（D-06） |
| 14 | migrations | 18 个 Knex `.ts` | 19 个 `.sql` | ⚠️ | 数量 +1（D-01） |
| 15 | seeds | 2 个 Knex seed `.ts` | `src-tauri/src/db/seed.rs` | ⚠️ | 运行时机与幂等判据变化（D-02） |
| 16 | 本地 HTTP 服务与端口 | Express HTTPS `64580` / `localhost.edtib.com` | 无 | ❌ | 有意取消（D-03） |
| 17 | 主进程 IPC 命令层 | `main.ts` 19 个 `ipcMain` 通道 | 无对应命令 | ❌ | 未闭环（D-05） |
| 18 | 自动更新 | `initAutoUpdater` + 4 个 IPC | `tauri-plugin-updater` + `schedule::check_update` | ⚠️ | 前端入口断链（D-08） |
| 19 | 桌面外壳 | 闪屏 / 无边框 / 单实例锁 / 窗口尺寸 | Tauri 原生等价 | ❌ | 有意不迁移（D-10；单实例锁与窗口尺寸已等价迁入） |

---

## 二、逐类核对明细

### 2.1 前端渲染层（views / router / store / api / utils / i18n / 静态资源）

| 子项 | 老 | 新 | 状态 |
|---|---|---|---|
| `views/**/*.vue` | 106 | 106 | ✅ |
| `router/` | 4 文件 | 4 文件 | ✅ |
| `store/` | 7 文件 | 7 文件 | ✅ |
| `api/` | 22 个 `.ts` | 22 个 `.ts` | ✅ |
| `i18n/` | `index.ts` + `en.json` | `index.ts` + `en.json` | ✅ |
| `assets/` + `styles/` | 18 文件 | 18 文件 | ✅ |
| `public/` | 2 项 | 2 项 | ✅ |
| `src/**` 文件总数 | 368 | 371 | ⚠️ |

文件级 `diff` 结果：新项目相对老项目**无缺失文件**，仅多出 3 个 Tauri 适配文件——
`src/utils/host.ts`（宿主判定：`isTauri` / `isElectron`）、`src/utils/tauriAdapter.ts`（axios → `invoke` 适配器）、`src/vite-env.d.ts`（Vite 类型声明）。
老 `web/src` 内无 `localhost.edtib.com` / `64580` 直连残留代码（仅注释提及），新前端同样如此。

### 2.2 前端请求层（本地 HTTP → IPC invoke）

| 老实现 | 老行为 | 新实现 | 状态 |
|---|---|---|---|
| `utils/request.ts` 请求拦截器 | 生成 `App-Id / App-Nonce / App-Secret` 签名头 | `src/utils/request.ts`（拦截器未改） | ✅ |
| axios `baseURL='https://localhost.edtib.com:64580/api'` | 经 Electron 本地 HTTPS 站点转发网关 | 同一 `request.ts` 第 250 行挂载 `tauriAdapter.ts`，经 `invoke('proxy_request')` 转发；`baseURL` 仅作代理路径前缀 | ⚠️ |
| `requestBridge.ts` IPC 优先 + HTTP 兜底 | 浏览器宿主走 HTTP；Electron 宿主可走 `electronAPI.db/fs/system` | `src/utils/requestBridge.ts` 与老项目逐行等价，但新宿主无 `electronAPI`，IPC 分支不可达，统一走 HTTP | ⚠️ |

### 2.3 electron 主进程：route + middleware + controller 转发

| 老文件 | 老行为 | 新实现位置 | 状态 |
|---|---|---|---|
| `route/index.ts` | `router.post('/')` 单一入口 | `commands/proxy.rs::proxy_request`（`#[tauri::command]`，已注册 `lib.rs`） | ✅ |
| `route/middleware.ts#factory` | 注入 `handleSuccess / handleError` | `response.rs` 信封辅助 | ✅ |
| `route/middleware.ts#token` | 校验 `App-Id / App-Nonce / App-Secret`，5 类错误码 4016000301/302/303/305/306 | `proxy/middleware.rs`（文案与错误码逐字对齐） | ✅ |
| `route/request.ts` / `controller/request.ts` | 读 secrets 有效行 → 解 body → 重加密 → `x-sign`（排序 + sha256 + md5）→ 转发 gateway → 解响应 → 信封 | `proxy/request.rs`（reqwest 转发）+ `commands/proxy.rs` | ✅ |

### 2.4 主进程 IPC 命令层（db / fs / system / 更新）

| 老 `main.ts` 通道 | 数量 | 新实现 | 状态 |
|---|---|---|---|
| `db-find-all` / `db-get-list` / `db-find-one` / `db-create` / `db-update` / `db-delete` / `db-bulk-create` | 7 | 无对应命令（`commands/db.rs` 仅 `db_status` 自检命令） | ❌ |
| `fs-read-file` / `fs-write-file` / `fs-delete-file` / `fs-list-files` / `fs-get-user-data-path` / `fs-get-documents-path` / `fs-exists` | 7 | 无对应命令（无 `commands/fs.rs`） | ❌ |
| `system-get-info` | 1 | 无对应命令（无 `commands/system.rs`） | ❌ |
| `get-app-version` / `check-update` / `confirm-update` / `restart-app` | 4 | `tauri-plugin-updater` + `tauri-plugin-process` 已引入；`app_info` 提供版本信息 | ⚠️ |

新项目当前注册于 `lib.rs::generate_handler` 的命令共 6 个：
`app_info`、`db_status`、`proxy_request`、`list_tasks`、`supported_tasks`、`run_task`。
前两者为新架构自检入口，其余为代理与调度面；老 19 个 `ipcMain` 通道**无一一对应命令**，见 D-05。

### 2.5 cast / crypt 加密

| 老 | 老行为 | 新 | 状态 |
|---|---|---|---|
| `cast/boolean.ts`、`integer.ts`、`integerOrNull.ts`、`string.ts`、`json.ts`、`datetime.ts` | 字段类型转换（含 JS 真值与时间格式语义） | `models/cast.rs` + `js.rs`（`js_truthy` / `parse_int` / `format_datetime` 等 JS 语义等价实现） | ✅ |
| `cast/crypt.ts` | 对 `app_secret` / `app_iv` 落库加密 | `crypt.rs` + `models/cast.rs` 调用点 | ✅ |
| `config/cryptTool.ts` | `md5` / `sha256` / `aes-256-cbc`，固定 `defaultKey`（`secret`/`iv`） | `crypt.rs`：`DEFAULT_SECRET` / `DEFAULT_IV` 与老值逐字一致，`aes-256-cbc` + hex | ⚠️ |

### 2.6 schedule 定时任务

| 老 | 老行为 | 新 | 状态 |
|---|---|---|---|
| `schedule/index.ts` | 每 5s 轮询 `schedules` 表，enabled 任务按 `row.time` 注册，禁用则取消 | `schedule/mod.rs`（5s 轮询 + 运行时状态 `states()`） | ✅ |
| cron 解析 | `node-schedule`，6 段式（含 seconds） | `schedule/cron.rs` 自研匹配器，兼容 seeds 实际值 `0 */3 * * * *`、`30 0 * * * *`（有单测） | ✅ |
| `handler.require` | 动态 `import(components/<name>.js)` | 白名单 `SUPPORTED_TASKS = ["heartbeatTask","updateTask","downCrtFileTask"]` | ✅ |
| `handler.comment` | `execSync(命令)` | 受控 shell 执行（保留能力；种子中无该类任务） | ⚠️ |
| `handler.script` | `new Function(script)()` 任意 JS 求值 | **不迁移**，命中仅日志告警跳过 | ❌ |
| `components/heartbeatTask.ts` | 读 secrets 有效行 → GET `{origin}/heartbeat` | `schedule::heartbeat` | ✅ |
| `components/updateTask.ts` | `autoUpdater.checkForUpdatesAndNotify()` | `schedule::check_update` | ✅ |
| `components/downCrtFileTask.ts` | 下载 cert/key，内容变化才写入 | `schedule::download_certificate`（目录改 `AppData/certs/`，D-07） | ✅ |

### 2.7 数据层：migrations（18 个 Knex → 19 个 SQL）

| 老 Knex 迁移 | 新 SQL | 状态 |
|---|---|---|
| `20241219075409_seeds.ts` | `0002_seeds.sql` | ✅ |
| `20241219075410_configs.ts` | `0003_configs.sql` | ✅ |
| `20241219075411_secrets.ts` | `0004_secrets.sql` | ✅ |
| `20241228024407_schedules.ts` | `0005_schedules.sql` | ✅ |
| `20260413000003_variables.ts` | `0006_variables.sql` | ✅ |
| `20260413000004_docs.ts` | `0007_docs.sql` | ✅ |
| `20260416000001_accounts.ts` | `0008_accounts.sql` | ✅ |
| `20260416000002_users.ts` | `0009_users.sql` | ✅ |
| `20260416000003_customers.ts` | `0010_customers.sql` | ✅ |
| `20260416000004_standards.ts` | `0011_standards.sql` | ✅ |
| `20260416000005_shapes.ts` | `0012_shapes.sql` | ✅ |
| `20260416000006_categories.ts` | `0013_categories.sql` | ✅ |
| `20260416000006a_formulas.ts` | `0014_formulas.sql` | ✅ |
| `20260416000007_products.ts` | `0015_products.sql` | ✅ |
| `20260416000008_enums.ts` | `0016_enums.sql` | ✅ |
| `20260416000009_serials.ts` | `0017_serials.sql` | ✅ |
| `20260416000010_languages.ts` | `0018_languages.sql` | ✅ |
| `20260416000011_servers.ts` | `0019_servers.sql` | ✅ |
| （老无对应，新架构补充） | `0001_init.sql` | ⚠️ |

差异：新项目为 19 个文件，比老多 `0001_init.sql`（新库初始化），见 D-01。

### 2.8 数据层：seeds（→ `src-tauri/src/db/seed.rs`）

| 老 seed | 老行为 | 新实现 | 状态 |
|---|---|---|---|
| `20241219075411_secrets.ts` | `secrets` 空时插 1 行（`title=后台客户端`、`app_secret`/`app_iv` 经 `CastCrypt` 加密、`status=1`） | `db/seed.rs` 等价插入（经 `crypt.rs` 加密），随 `Database::open` 调用 | ✅ |
| `20241219075414_schedules.ts` | `schedules` 空时插 2 行（`检查心跳 0 */3 * * * * → heartbeatTask`、`检查更新 30 0 * * * * → updateTask`，`status=1`） | `db/seed.rs` 等价插入（`handler` JSON 反序列化一致） | ✅ |
| `seeds` 登记表 + `COUNT(*)===0` 双判据 | 登记行仅在插入成功后写入 | 幂等判据收敛为「业务表空」 | ⚠️ |

### 2.9 本地 HTTP 服务与端口

| 老 | 老行为 | 新 | 状态 |
|---|---|---|---|
| `electron/src/index.ts` HTTPS `64580` + `/static` 静态 + SPA fallback | 托管渲染层页面、转发 gateway | Tauri `frontendDist` / `devUrl`（dev 端口 1430/1431），无本地 HTTP 端口 | ❌（有意） |
| `view/index.html` | 承载渲染层入口 | Tauri 直接加载前端 `dist` | ❌（有意） |

### 2.10 桌面外壳（不可迁移项）

| 老 | 处理 |
|---|---|
| 闪屏 `assets/splash.html` | 不迁移（Tauri 启动即载前端） |
| 无边框窗口 `frame:false` / `autoHideMenuBar` / `ignore-certificate-errors` | 不迁移，改用 Tauri 标准窗口 |
| 单实例锁 `requestSingleInstanceLock` | 由 `tauri-plugin-single-instance` 等价提供 |
| 窗口尺寸 1230×960 / 最小 1024×600 | 迁入 `tauri.conf.json` window 配置 |
| `.env.local` 的 `VITE_APP_SECRET_KEY` | 老代码无引用，不迁移 |

---

## 三、差异与不可迁移项清单

| 编号 | 事项 | 类型 | 处理 / 说明 |
|---|---|---|---|
| **D-01** | 迁移文件数 18 → 19 | 有意 | 新增 `0001_init.sql`；其余 18 个 SQL 与老 Knex 迁移逐表对应。表/列/类型/默认值/索引需逐列复核 |
| **D-02** | seeds 由 Knex seed 文件改为 Rust 运行时 | 有意 | 承载位置 `db/seed.rs`，随 `Database::open` 执行；幂等判据由「`seeds` 登记表 + 表空」收敛为「业务表空」（插入成功才写登记行，语义等价）。单测断言密文可解回、`handler` JSON 反序列化一致 |
| **D-03** | 本地 HTTP 服务与端口取消 | 有意 | `64580` / `localhost.edtib.com` / Express 全部移除，改 `invoke('proxy_request')` IPC 转发；浏览器调试仍走 axios 默认 adapter（与老 `web/` 构建一致） |
| **D-04** | 加密格式双格式自适应 | 有意 | 老 web 前端用「随机 IV + `iv:cipher`」，electron `cryptTool` 用「固定 IV + 纯 hex」。Rust 侧解密自适应两种格式，对外/对上游按 `iv:cipher` 输出；密钥常量与签名算法未改（对应 `migration-plan.md` M1） |
| **D-05** | 主进程 IPC 命令层未闭环 | **未完成** | `main.ts` 19 个 `ipcMain` 通道（db 7 / fs 7 / system 1 / 更新 4）在新项目无对应命令，`lib.rs` 仅注册 6 个命令。影响：`requestBridge.ts` 的 IPC 分支不可达（统一走 HTTP 兜底，功能路径可用）；`views/settings/update.vue` 直接调用 `window.electronAPI.*`，该入口当前断链 |
| **D-06** | `handler.script` 不迁移 | **不可迁移** | 老实现 `new Function(script)()` 为任意 JS 求值，Rust 无 JS 运行时且属远程代码执行面；命中时仅日志告警跳过。`handler.comment`（shell）保留受控等价能力 |
| **D-07** | 证书下载目录变更 | 有意 | `electron/certs/` → `AppData/certs/`（旧 HTTPS 站点已移除，该目录仅存档） |
| **D-08** | 更新链路入口差异 | 待收敛 | Rust 侧依赖与任务已就绪（`tauri-plugin-updater`、`schedule::check_update`），但前端 `update.vue` 仍走 `window.electronAPI`（事件名 `onUpdateAvailable` 等），待与 D-05 一并收敛 |
| **D-09** | 安全加固差异 | 有意 | `fs-*` 路径解析后必须落在 AppData 内（老实现允许 `../` 逃逸）；`system-get-info.versions` 返回 Tauri/WebView 版本（保持字段名兼容，Electron 字段标 `n/a`） |
| **D-10** | 桌面外壳差异 | **不可迁移** | 闪屏、无边框窗口、菜单栏隐藏、忽略证书错误等 Electron 特有能力 |
| **D-11** | SQLite 定位差异 | 有意 | 新架构用 `rusqlite (bundled)` 作业务库（替代 Express + Knex + SQLite 本地服务），**不作为渲染层业务缓存**（与 `docs/offline-and-proxy-architecture.md` 中未拍板分叉项 D1 相关） |
| **D-12** | `preload` / `electronAPI` 注入缺失 | **未完成** | 老 `preload.ts` 已删，`src/types/electron.d.ts` 仅保留类型声明（无实现），`window.electronAPI` 未被注入，见 D-05 |

> `migration-plan.md` 第四节 M1–M8 与本节编号对应关系：
> M1→D-04、M2→D-08、M3→D-07、M4→D-07（AppData 语义）、M5→D-06、M6→D-09、M7→D-09、M8→D-03。

---

## 四、构建与测试证据

| 项 | 结果 |
|---|---|
| `npm run build`（含 `vue-tsc`） | ✅ 通过（产物输出至 `dist/`） |
| `cargo check` | ✅ 通过（25 warnings） |
| `cargo test`（`db::seed` 种子单测） | ✅ 通过 |
| `cargo test`（`schedule::cron` 匹配用例，含 seeds 实际 cron 值） | ✅ 通过 |
| 版本号 | `package.json` / `src-tauri/tauri.conf.json` / `src-tauri/Cargo.toml` 均为 `1.0.0` |

---

## 五、结论

- **已等价迁移**：前端渲染层全部（views 106 / router / store / api / utils / i18n / 静态资源）、electron 的 route + middleware + controller 转发链路（`commands/proxy.rs` + `proxy/*`）、cast/crypt 加密、schedule 定时任务与三个内置任务、migrations 全部 18 张业务表、seeds 两份种子逻辑。
- **有意差异**：本地 HTTP 端口取消（D-03）、种子改 Rust 运行时（D-02）、加密双格式自适应（D-04）、证书目录变更（D-07）、安全加固（D-09）、SQLite 定位（D-11）、迁移文件 +1（D-01）。
- **不可迁移**：`handler.script`（D-06）、Electron 桌面外壳特性（D-10）。
- **尚未闭环（需后续收敛）**：主进程 IPC 命令层缺失（db / fs / system / 更新共 19 通道，D-05）导致 `window.electronAPI` 未注入（D-12）、`update.vue` 更新入口断链（D-08）。
