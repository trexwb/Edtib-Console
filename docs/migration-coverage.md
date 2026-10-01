# 迁移覆盖度对照表：老 console（Electron）→ 新 edtib/console（Tauri v2）

- 核对日期：2026-09-29（2026-10-01 复核：D-05 / D-08 / D-12 已闭环，本文按最新代码更新）
- 老项目（严格只读）：`/Users/wbtrex/website/localServer/node/edtib/client/console`（历史核对路径，当前机器已不存在，仅保留作对照记录）
- 新项目：`/Users/wbtrex/AI助手/node/edtib/console`
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
| 5 | 前端 utils | `web/src/utils` | `src/utils` | ✅ | 新增 `host.ts`、`tauriAdapter.ts`；`src/bridge/` 注入 `window.electronAPI`，IPC 分支已可达（D-05 已闭环） |
| 6 | 前端 i18n | `web/src/i18n/{index.ts,en.json}` | `src/i18n/{index.ts,en.json}` | ✅ | — |
| 7 | 静态资源 | `web/src/{assets,styles}` 18 文件、`public` 2 项 | 同数量 | ✅ | — |
| 8 | 前端请求层 | `web/src/utils/request.ts` + axios 直连 64580 | `request.ts` + `tauriAdapter.ts`（invoke） | ⚠️ | 本地端口取消（D-03） |
| 9 | electron route + middleware | `route/{index,request,middleware}.ts` | `commands/proxy.rs` + `proxy/{middleware,request}.rs` | ✅ | — |
| 10 | electron controller 转发 | `controller/request.ts` | `proxy/request.rs` + `commands/proxy.rs` | ✅ | — |
| 11 | cast 类型转换 | `cast/*.ts` 7 个 | `models/cast.rs` + `js.rs` | ✅ | — |
| 12 | crypt 加密 | `cast/crypt.ts` + `config/cryptTool.ts` | `crypt.rs` + `config.rs` | ⚠️ | 双格式自适应（D-04）；密钥改环境变量注入（D-13） |
| 13 | schedule 定时任务 | `schedule/index.ts` + 3 个 task | `schedule/{mod,cron,tasks}.rs` | ⚠️ | `script` handler 不迁移（D-06） |
| 14 | migrations | 18 个 Knex `.ts` | 19 个 `.sql` | ⚠️ | 数量 +1（D-01） |
| 15 | seeds | 2 个 Knex seed `.ts` | `src-tauri/src/db/seed.rs` | ⚠️ | 运行时机与幂等判据变化（D-02） |
| 16 | 本地 HTTP 服务与端口 | Express HTTPS `64580` / `localhost.edtib.com` | 无 | ❌ | 有意取消（D-03） |
| 17 | 主进程 IPC 命令层 | `main.ts` 19 个 `ipcMain` 通道 | `commands/{db,fs,system,app}.rs` 共 19 个同名命令 + `src/bridge/` 注入 `window.electronAPI` | ✅ | 见 D-05（已闭环） |
| 18 | 自动更新 | `initAutoUpdater` + 4 个 IPC | `update.rs`（`tauri-plugin-updater`）+ `check_update`/`confirm_update`/`restart_app` + `views/settings/update.vue` 经 bridge 接入 | ✅ | 事件名改 `updater:*`（D-08 已闭环） |
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
| `src/**` 文件总数 | 368 | 374 | ⚠️ |

文件级 `diff` 结果：新项目相对老项目**无缺失文件**，仅多出 Tauri 适配文件——
`src/utils/host.ts`（宿主判定：`isTauri` / `isElectron`）、`src/utils/tauriAdapter.ts`（axios → `invoke` 适配器）、`src/bridge/{channels,types,index}.ts`（`window.electronAPI` 桥接层，等价老 `preload.ts`）、`src/vite-env.d.ts`（Vite 类型声明）。
老 `web/src` 内无 `localhost.edtib.com` / `64580` 直连残留代码（仅注释提及），新前端同样如此。

### 2.2 前端请求层（本地 HTTP → IPC invoke）

| 老实现 | 老行为 | 新实现 | 状态 |
|---|---|---|---|
| `utils/request.ts` 请求拦截器 | 生成 `App-Id / App-Nonce / App-Secret` 签名头 | `src/utils/request.ts`（拦截器未改） | ✅ |
| axios `baseURL='https://localhost.edtib.com:64580/api'` | 经 Electron 本地 HTTPS 站点转发网关 | 同一 `request.ts` 第 252 行挂载 `tauriAdapter.ts`，经 `invoke('proxy_request')` 转发；`baseURL` 仅作代理路径前缀 | ⚠️ |
| `requestBridge.ts` IPC 优先 + HTTP 兜底 | 浏览器宿主走 HTTP；Electron 宿主可走 `electronAPI.db/fs/system` | `src/utils/requestBridge.ts` 与老项目逐行等价；Tauri 宿主由 `src/bridge/index.ts::setupBridge()` 挂载同名 `window.electronAPI`（`invoke` 转发），IPC 分支已可达，浏览器宿主仍走 HTTP | ✅ |

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
| `db-find-all` / `db-get-list` / `db-find-one` / `db-create` / `db-update` / `db-delete` / `db-bulk-create` | 7 | `commands/db.rs`（同名 7 个 `#[tauri::command]`，表名走 `models` 白名单；`db_get_list` 返回裸 `{total,list}`，其余返回信封） | ✅ |
| `fs-read-file` / `fs-write-file` / `fs-delete-file` / `fs-list-files` / `fs-get-user-data-path` / `fs-get-documents-path` / `fs-exists` | 7 | `commands/fs.rs`（同名 7 个命令，路径经 `paths::resolve` 限定在 AppData / 文档目录内，拒绝 `..` 与绝对路径逃逸，见 D-09） | ✅ |
| `system-get-info` | 1 | `commands/system.rs`（平台 / 架构 / 主机名 / CPU 数 / WebView 版本；内存字段按老契约返回空串，不引入新依赖） | ✅ |
| `get-app-version` / `check-update` / `confirm-update` / `restart-app` | 4 | `commands/app.rs` + `update.rs`（`tauri-plugin-updater` 下载后暂存字节，`confirm_update` 才 `install`；`restart_app` 用 `app.restart()`） | ✅ |

`lib.rs::generate_handler` 当前注册命令共 **25 个**：
`app_info`、`get_app_version`、`check_update`、`confirm_update`、`restart_app`、
`db_status`、`db_find_all`、`db_get_list`、`db_find_one`、`db_create`、`db_update`、`db_delete`、`db_bulk_create`、
`fs_read_file`、`fs_write_file`、`fs_delete_file`、`fs_list_files`、`fs_get_user_data_path`、`fs_get_documents_path`、`fs_exists`、
`proxy_request`、`list_tasks`、`supported_tasks`、`run_task`、`system_get_info`。

渲染层侧由 `src/bridge/index.ts::setupBridge()` 在 Tauri 宿主下注入 `window.electronAPI`（`main.ts` 中先于 `createApp` 调用），
命令名映射见 `src/bridge/channels.ts`，事件名映射见 `BRIDGE_EVENTS`（`updater:*`）；老 19 个 `ipcMain` 通道已全部一一对应，见 D-05 / D-12。

### 2.5 cast / crypt 加密

| 老 | 老行为 | 新 | 状态 |
|---|---|---|---|
| `cast/boolean.ts`、`integer.ts`、`integerOrNull.ts`、`string.ts`、`json.ts`、`datetime.ts` | 字段类型转换（含 JS 真值与时间格式语义） | `models/cast.rs` + `js.rs`（`js_truthy` / `parse_int` / `format_datetime` 等 JS 语义等价实现） | ✅ |
| `cast/crypt.ts` | 对 `app_secret` / `app_iv` 落库加密 | `crypt.rs` + `models/cast.rs` 调用点 | ✅ |
| `config/cryptTool.ts` | `md5` / `sha256` / `aes-256-cbc`，固定 `defaultKey`（`secret`/`iv`）明文写在源码 | `crypt.rs` + `config.rs`：`defaultKey` 改为 `EDTIB_FIELD_CRYPT_SECRET` / `EDTIB_FIELD_CRYPT_IV` 读取，未配置时由 `EDTIB_APP_SECRET` 做 `sha256` 派生（`key` 取 32 hex、`iv` 取 16 hex），**源码内不含任何密钥常量**；`aes-256-cbc` + hex 与 `md5` / `sha256` 算法逐字等价 | ⚠️ |
| —（老无对应） | — | `config.rs::init()` + `console.env` 密钥文件加载：打包态 macOS 不继承 shell 环境变量，密钥改由 `<AppData>/console.env`（或 `EDTIB_ENV_FILE` 指定路径）注入；进程环境变量优先于文件，缺失时 `missing_env()` 打日志并**失败关闭**（所有 `proxy_request` 直接拒绝） | ✅ |

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
| **D-04** | 加密格式双格式自适应 | 有意 | 老 web 前端用「随机 IV + `iv:cipher`」，electron `cryptTool` 用「固定 IV + 纯 hex」。Rust 侧解密自适应两种格式，对外/对上游按 `iv:cipher` 输出；签名算法未改，但密钥常量已改为环境变量注入（见 D-13，对应 `migration-plan.md` M1） |
| **D-05** | 主进程 IPC 命令层 | **已闭环（2026-10-01）** | 老 `main.ts` 的 19 个 `ipcMain` 通道（db 7 / fs 7 / system 1 / 更新 4）已全部实现为 Tauri 命令并注册（`lib.rs` 共 25 个）；`requestBridge.ts` 的 IPC 分支（离线优先）随 `setupBridge()` 生效，非白名单表 / 本地空表 / 命令失败仍按原设计兜底回 HTTP；`views/settings/update.vue` 已改走 `bridge.*`，入口断链同步收敛 |
| **D-06** | `handler.script` 不迁移 | **不可迁移** | 老实现 `new Function(script)()` 为任意 JS 求值，Rust 无 JS 运行时且属远程代码执行面；命中时仅日志告警跳过。`handler.comment`（shell）保留受控等价能力 |
| **D-07** | 证书下载目录变更 | 有意 | `electron/certs/` → `AppData/certs/`（旧 HTTPS 站点已移除，该目录仅存档） |
| **D-08** | 更新链路入口差异 | **已闭环（2026-10-01）** | `update.rs` 统一发出 `updater:update-available` / `updater:update-not-available` / `updater:download-progress` / `updater:update-downloaded`，前端 `src/bridge/index.ts` 用 `listen()` 订阅并返回反注册函数；`update.vue` 改为「下载完成 → `confirm_update` 安装 → `restart_app`」两段式，不再依赖 Electron `autoUpdater` 事件名。端点与签名公钥来自 `tauri.conf.json` 的 `plugins.updater`（或 `EDTIB_UPDATER_ENDPOINT` 覆盖） |
| **D-09** | 安全加固差异 | 有意 | `fs-*` 路径解析后必须落在 AppData / 文档目录内（`paths::resolve` 拒绝 `..` 与绝对路径逃逸，含单测）；`system-get-info.versions` 返回 Tauri/WebView 版本（保持字段名兼容，Electron 字段标 `n/a`） |
| **D-10** | 桌面外壳差异 | **不可迁移** | 闪屏、无边框窗口、菜单栏隐藏、忽略证书错误等 Electron 特有能力 |
| **D-11** | SQLite 定位差异 | 有意 | 新架构用 `rusqlite (bundled)` 作业务库（替代 Express + Knex + SQLite 本地服务），**不作为渲染层业务缓存**（与 `docs/offline-and-proxy-architecture.md` 中未拍板分叉项 D1 相关） |
| **D-12** | `preload` / `electronAPI` 注入 | **已闭环（2026-10-01）** | 老 `preload.ts` 已删除，改由渲染层 `src/bridge/index.ts::setupBridge()` 在 Tauri 宿主下挂载 `window.electronAPI`（`main.ts` 中先于 `createApp` 调用），类型由 `src/bridge/types.ts` 单一来源提供，`src/types/electron.d.ts` 仅做全局声明转发；浏览器宿主不注入，`requestBridge.ts` 自动退回 HTTP。命令未注册 / 返回非预期结构时逐调用点降级，不阻断业务 |
| **D-13** | 密钥改环境变量注入 | 有意（安全红线） | 源码不再内置 `DEFAULT_SECRET` / `DEFAULT_IV` 与网关凭证；本地链路凭证读 `EDTIB_APP_ID` / `EDTIB_APP_SECRET` / `EDTIB_APP_IV`，字段级密钥读 `EDTIB_FIELD_CRYPT_SECRET` / `EDTIB_FIELD_CRYPT_IV`（缺省由 `EDTIB_APP_SECRET` 派生），网关凭证读 `EDTIB_DEV_*` / `EDTIB_PROD_*`。缺失时**失败关闭**（`proxy_request` 直接拒绝并打日志）。打包态环境变量注入方式：`<AppData>/console.env` 或 `EDTIB_ENV_FILE` 指定路径，详见 `.env.example` |
| **D-14** | 老 `cryptSecrets()` 内置默认值移除 | 有意（安全红线） | 老项目在 `config/cryptTool.ts` / `secrets` 兜底里硬编码 dev / prod 网关凭证与登录页默认账号密码；新项目全部改环境变量，登录页与 `VabLock` 锁屏不再预填任何真实账号密码（`src/views/login/index.vue`、`library/components/VabLock/index.vue`） |
| **D-15** | 离线登录缓存明文落盘 | 待评估 | `src/api/authorize.ts` 的 `getUserInfo()` 会把登录态写入 `user/login-cache.json`（AppData 内明文，与老 Electron 实现一致）。`fs-*` 命令闭环后该路径真正生效，风险由「理论」变「实际」。建议后续改走 macOS Keychain（参考 `books/src-tauri/src/keychain.rs`）或在写入前用字段级密钥加密，需产品侧确认是否允许离线首屏 |

> `migration-plan.md` 第四节 M1–M8 与本节编号对应关系：
> M1→D-04、M2→D-08、M3→D-07、M4→D-07（AppData 语义）、M5→D-06、M6→D-09、M7→D-09、M8→D-03。

---

## 四、构建与测试证据（2026-10-01 复核）

| 项 | 结果 |
|---|---|
| `npm run typecheck`（`vue-tsc --noEmit`） | ✅ 通过（exit 0） |
| `npm run build`（`vite build`） | ⚠️ **无法产出 `dist/`**：插件链已能完整注册（此前缺授权码时直接 `return undefined` 导致崩溃，见 `library/build/index.ts`），但商业模板 `unplugin` 在无 `VITE_APP_GITHUB_USER_NAME` / `VITE_APP_SECRET_KEY` 时于授权校验处终止进程（exit 0 且不落盘）。需项目负责人在 `.env.local` 补入购买的 key 后复验 |
| `cargo check --all-targets` | ✅ 通过（10 warnings，均为存量未引用的兼容项：`LEGACY_SERVER_*`、`Cast::IntegerOrNull/Boolean/Datetime`、`passthrough`、`proxy::Context::data`、`response::failure/failure_with`、`CronSpec::expression`） |
| `cargo test` | ✅ 31 passed / 0 failed（含 `db::seed` 种子、`schedule::cron` 匹配、`paths::resolve` 越权路径拒绝、`config` 密钥文件解析、`proxy` 信封与签名用例） |
| 版本号 | `package.json` / `src-tauri/tauri.conf.json` / `src-tauri/Cargo.toml` 均为 `1.0.0` |

---

## 五、结论

- **已等价迁移**：前端渲染层全部（views 106 / router / store / api / utils / i18n / 静态资源）、electron 的 route + middleware + controller 转发链路（`commands/proxy.rs` + `proxy/*`）、cast/crypt 加密、schedule 定时任务与三个内置任务、migrations 全部 18 张业务表、seeds 两份种子逻辑，以及原先缺失的主进程 IPC 命令层（db 7 / fs 7 / system 1 / 更新 4 共 19 通道）与 `window.electronAPI` 注入（D-05 / D-08 / D-12 已闭环，渲染层 38 处 `ipc:` 调用点在 Tauri 宿主下真正生效）。
- **有意差异**：本地 HTTP 端口取消（D-03）、种子改 Rust 运行时（D-02）、加密双格式自适应（D-04）、证书目录变更（D-07）、安全加固（D-09）、SQLite 定位（D-11）、迁移文件 +1（D-01）、密钥全部环境变量化（D-13 / D-14）。
- **不可迁移**：`handler.script`（D-06）、Electron 桌面外壳特性（D-10）。
- **待处理（需项目负责人拍板）**：
  1. 离线登录缓存明文落盘（D-15）。
  2. 商业模板授权码缺失导致 `npm run build` 无法产出 `dist/`（§四），发布前必须在 `.env.local` 补齐，并同时提供 `EDTIB_APP_*` / `EDTIB_PROD_APP_*` 密钥文件（`console.env`）与 `VITE_APP_*`，两套值必须一致，否则代理链路验签直接 4016000305。
  3. `src/services/SyncService.ts` 为未接入的死模块且存在解包错误（`existing?.data` 与 `db_find_one` 返回的信封结构不符）、表名映射与默认同步表集合无交集，需确认是否随离线方案一并落地。
  4. 登录前对密码做 `md5` 后再送网关（`src/api/authorize.ts`）是既有传输契约，改动需与 gateway 同步评估（见 gateway 修复报告 MD5 迁移方案）。
