# console 迁移计划：Electron → Tauri v2（分批执行）

- 老项目（严格只读）：`/Users/wbtrex/website/localServer/node/edtib/client/console`
- 新项目：`/Users/wbtrex/website/localServer/node/edtib/console`
- 版本号：`package.json` / `src-tauri/tauri.conf.json` / `src-tauri/Cargo.toml` 统一 `1.0.0`
- 范围约束：不迁移历史数据、不做旧库兼容；本轮**不实现 outbox / 密钥改造**，保持老行为逻辑

---

## 一、现状盘点（起点）

### 1.1 已完成（历史批次）

| 项 | 状态 | 位置 |
|---|---|---|
| 新项目 Tauri v2 骨架 | 完成 | `src-tauri/`（Cargo.toml、tauri.conf.json、capabilities、icons、build.rs） |
| 前端整体迁入 | 完成（待基线校验） | `src/`（Vue3 页面/路由/store/api/工具）、`public/` |
| 迁移决策文档 | 完成 | `docs/electron-to-tauri.md`、`docs/offline-and-proxy-architecture.md` |
| 18 个 Knex 迁移 → SQL | 完成（待逐列核对） | `src-tauri/migrations/0002_seeds.sql` ~ `0019_servers.sql` |
| Seeds 2 个等价逻辑 | 完成（待核对） | 同上 |
| Rust 基础模块 | 部分完成 | `js.rs`、`crypt.rs`（md5/sha256/aes 固定 IV）、`config.rs`、`response.rs`（Envelope）、`models/{mod,cast}.rs`（12 表注册表）、`db/{mod,query}.rs` |
| 前端请求层/桥接 | **仅类型声明** | `src/utils/requestBridge.ts`（IPC 优先 + HTTP 兜底）、`src/types/electron.d.ts`；**`window.electronAPI` 尚无实现** |

### 1.2 待办（本次任务范围）

1. **Rust 命令层**：老 `electron/src/main.ts` 的全部 `ipcMain.handle` / `ipcMain.on`（db 7 + fs 7 + system 1 + 版本/更新 4）→ Tauri commands
2. **Rust 代理层**：老 `electron/src/route/middleware.ts`（鉴权 + 响应信封）+ `electron/src/controller/request.ts`（转发 gateway、x-sign 签名、加解密）→ Tauri command
3. **Rust 定时调度**：老 `electron/src/schedule/`（node-schedule 动态注册 + 3 个内置任务）→ tokio
4. **Rust 自动更新**：老 `main.ts#initAutoUpdater`（事件 + 启动检查 + 1 小时轮询 + 确认安装）→ tauri-plugin-updater
5. **前端桥接层**：`window.electronAPI`（invoke 实现）+ axios 实例的 Tauri adapter（HTTP 本地端口 → invoke）
6. **基线校验与覆盖度对照表**

---

## 二、老功能点全清单（迁移映射草案）

### 2.1 渲染层（Vue3，HTTP → invoke）

| 老实现 | 老行为 | 新实现位置 |
|---|---|---|
| `web/src/**`（页面/路由/store/api/工具/i18n） | 控制台全部界面与业务逻辑 | `src/**`、`public/**`（已迁，B0 校验） |
| `web/src/utils/request.ts` 请求拦截 | 生成 `App-Id/App-Nonce/App-Secret` 签名头、请求体 AES 加密、响应解密、401/402 跳登录 | `src/utils/request.ts`（保留拦截器）+ 新增 Tauri adapter（B5） |
| axios → `https://localhost.edtib.com:64580/api/*` | 经 Electron 本地 HTTPS 站点转发 gateway | axios adapter → `invoke('proxy_request')`（B3/B5） |
| `web/preload` 无（走 preload.ts） | `contextBridge` 暴露 `electronAPI` | `src/utils/tauriElectronApi.ts` 挂载 `window.electronAPI`（B5） |

### 2.2 数据层（IPC）

| 老 IPC 通道 | 老行为 | 新实现 |
|---|---|---|
| `db-find-all` (table, filters) | `model.getAll(filters)` | `commands/db.rs::db_find_all` |
| `db-get-list` (table, filters, order, limit, offset) | `model.getList(...)` → `{total, list}` | `db_get_list` |
| `db-find-one` (table, id) | `model.getRow({$primaryKey: id})` | `db_find_one` |
| `db-create` (table, data) | `model.create(data)`（支持数组=批量） | `db_create` |
| `db-update` (table, id, data) | `model.update({pk: id}, data)` | `db_update` |
| `db-delete` (table, id) | `model.delete({pk: id})` | `db_delete` |
| `db-bulk-create` (table, data) | 同 `create`（批量） | `db_bulk_create` |
| 表白名单 `ALLOWED_TABLES`（12 表） | 非白名单抛 `Table "x" is not in the allowed whitelist` | `models/mod.rs` 注册表 + 同文案错误 |

### 2.3 文件系统 / 系统信息

| 老 IPC 通道 | 老行为 | 新实现 |
|---|---|---|
| `fs-read-file` | `readFile(userData + path, 'utf-8')` | `commands/fs.rs::fs_read_file`（路径相对 AppData） |
| `fs-write-file` | 递归建目录 + utf-8 写入，返回绝对路径 | `fs_write_file` |
| `fs-delete-file` | `unlink` → `true/false` | `fs_delete_file`（加 AppData 越界防护，见 M6） |
| `fs-list-files` | `readdir` | `fs_list_files` |
| `fs-get-user-data-path` | `app.getPath('userData')` | `fs_get_user_data_path`（AppData，见 M4） |
| `fs-get-documents-path` | `app.getPath('documents')` | `fs_get_documents_path` |
| `fs-exists` | `access` → `true/false`（失败仍 code 200） | `fs_exists` |
| `system-get-info` | platform/arch/hostname/cpus/内存/versions | `commands/system.rs::system_get_info`（见 M7） |

### 2.4 本地服务（Express + HTTPS 站点 → Rust 代理层）

| 老实现 | 老行为 | 新实现 |
|---|---|---|
| `index.ts` HTTPS 服务 64580 + `/static` 静态 + SPA fallback | 托管渲染层页面 | Tauri `frontendDist` / `devUrl`（不再需要本地 HTTPS 端口） |
| `route/middleware.ts#factory` | 注入 `handleSuccess/handleError` | `response.rs` Envelope 辅助 |
| `route/middleware.ts#token` | 校验 `App-Id/App-Nonce/App-Secret`（含 nonce 格式、时间戳有效期 1800s、签名复算），错误码 4016000301/302/303/305/306 | `commands/proxy.rs` 鉴权段 |
| `route/middleware.ts#response` | 统一信封 `{code,message,timestamp}`，data 存在时用 `appSecret/appIv` 加密为 `encryptedData` | `proxy.rs` 响应段 |
| `controller/request.ts#requestMake` | 读 secrets 有效行取 app_url/app_id/app_secret/app_iv → 解 body → 重加密 → `x-sign`（排序 + sha256 + md5）→ axios 转发 → 解响应 → 信封 | `proxy.rs` 转发段 |

### 2.5 定时调度（node-schedule → tokio）

| 老实现 | 老行为 | 新实现 |
|---|---|---|
| `schedule/index.ts#handler` | 每 5s 轮询：enabled 任务按 `row.time`（cron）注册 3 类 job；无 enabled 则取消对应 job | `schedule/mod.rs` 轮询 + cron 匹配器 |
| `handler.comment` | `execSync(命令)` | 同名任务：受控 shell 执行（M5） |
| `handler.script` | `new Function(script)()`（任意 JS） | **不迁移**（M5，日志告警跳过） |
| `handler.require` | 动态 `import(components/<name>.js)` | 白名单映射三个内置任务 |
| `components/heartbeatTask` | 读 secrets 有效行 → GET `{origin}/heartbeat` | `schedule::heartbeat` |
| `components/downCrtFileTask` | 下载 static.edtib.com 的 cert/key，内容变化才写入 | `schedule::download_certificate`（目录见 M3） |
| `components/updateTask` | `autoUpdater.checkForUpdatesAndNotify()` | `update::check_and_notify` |

### 2.6 自动更新（electron-updater → tauri-plugin-updater）

| 老实现 | 老行为 | 新实现 |
|---|---|---|
| `initAutoUpdater` | 绑定 checking/available/not-available/error/download-progress/downloaded 事件 | `src/update.rs` 事件桥（事件名见 M2，经 shim 映射回原回调名） |
| 启动检查 + `setInterval` 1h | 非 development 环境自动检查 | `update.rs`：启动检查 + 1h 轮询（非 dev） |
| `get-app-version` | `"{versionAlias}-v{version}({versionTimer})"` | `get_app_version`（常量见 M2） |
| `check-update` | `checkForUpdatesAndNotify()`，失败弹原生对话框 | `check_update`：检查 → 下载安装 → 事件；失败发 `update://error` |
| `update-downloaded` | 原生对话框（重启应用 / 稍后再试）+ 通知渲染层 | 通知渲染层（前端已有进度/按钮 UI），安装走 `confirm_update`（M2） |
| `confirm-update` | `quitAndInstall()` | `confirm_update` → updater install |
| `restart-app` | `app.relaunch(); app.exit(0)` | shim `restartApp()` → `@tauri-apps/plugin-process` 的 `relaunch()` |

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

### B0 基线校验与差异清单（只读，产出清单）

- 老 `web/` 全量 `src`、`public` 与新 `src`、`public` 做文件级比对：缺失文件、内容差异（排除新项目已有的 Tauri 适配文件：`utils/requestBridge.ts`、`types/electron.d.ts`）
- 老 `electron/src/**` 资产清单 vs 新 `src-tauri/src/**` 覆盖情况
- **产出**：`docs/migration-baseline.md`（差异清单 + 修复项）
- **验收**：差异清单为 0 项（或全部为"有意差异"并已登记）

### B1 Rust 数据层对齐

- 核对 18 个 Knex 迁移与 `migrations/*.sql` 的**表/列/类型/默认值/索引/唯一约束/外键**逐项等价（含 2 个 seed 的幂等写法）
- 核对 `models/mod.rs` 12 表注册表（表名、`$primaryKey`、`$fillable/$guarded`、`$casts`、where hook）与老 `electron/src/model/*.ts` 一一对应
- 核对 `db/query.rs`：`get_all / get_list / get_row / create / update / delete / bulk_create`（含 cast、时间格式、`{total, list}` 结构）
- **验收**：`cargo test` 通过（迁移顺序执行、CRUD 往返、cast 断言）

### B2 Rust 命令层（IPC 等价）

- `commands/db.rs`（7 个）、`commands/fs.rs`（7 个）、`commands/system.rs`（1 个）、`commands/app.rs`（版本/更新/重启）
- `lib.rs` `invoke_handler` 全量注册；命令返回值统一为老信封 `{code,message,timestamp,data}`（失败不 reject，与老 IPC 一致）
- **验收**：`cargo check` 通过 + 命令清单 ↔ 老 `ipcMain.handle` 一一对应表（无遗漏）

### B3 代理层（Express → Rust）

- `crypt.rs` 增补 `iv:cipher` 随机 IV 格式的加/解密（与 web 前端/gateway 约定一致），并对入参做格式自适应（见 M1）
- `commands/proxy.rs`：鉴权（5 类错误码与文案逐字对齐）→ body 解密/重加密 → `x-sign` 签名 → reqwest 转发（保留响应头）→ 响应解密 → 信封
- **验收**：`cargo test` 含签名字符串向量、`iv:cipher` 往返、错误码断言；`cargo check` 通过

### B4 定时调度 + 自动更新

- `schedule/mod.rs`：5s 轮询、cron 匹配器（支持 5/6 段与 `*`/`a-b`/`*/n`/`a,b`）、按 `row.id` 注册与取消、三个内置任务实现
- `src/update.rs`：updater 检查/下载/安装、事件发射、启动检查 + 1h 轮询（非 dev）
- **验收**：`cargo test` 含 cron 匹配用例（含 seeds 中实际 cron 值）；`cargo check` 通过

### B5 前端桥接层（HTTP → invoke）

- `src/utils/tauriElectronApi.ts`：实现 `window.electronAPI`（`db/fs/system/update*/getAppVersion/restartApp`），全部经 `invoke` 调用 B2/B3 命令，事件经 `@tauri-apps/api/event` 映射回老回调名
- `src/utils/request.ts`：Tauri 环境下挂载 Tauri adapter（复刻老 HTTP 语义：状态码/响应头/`encryptedData` 信封、非 2xx 走 reject 分支）
- `src/main.ts`：非侵入式安装桥接（仅 Tauri 环境生效，浏览器环境行为不变）
- **验收**：`npm run build`（含 `vue-tsc`）通过

### B6 全量验收与覆盖度对照表

- `npm run build`、`cargo check`、`cargo test` 三项全绿
- **产出**：`docs/功能覆盖度对照表.md`——「老功能点 → 新实现位置 → 验收依据 → 状态」逐行对照 + 已知差异/未迁移项清单
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

---

## 五、风险与回滚

- **老项目全程只读**：任何写入仅发生在 `edtib/console` 内；老项目仅做读取与比对
- **分批可回退**：每批产物独立（Rust 模块 / 前端文件），失败时仅回退该批文件，不影响已完成批次
- **依赖新增**：仅 `sysinfo`（系统信息）、`reqwest`（HTTP 转发）等实现必需项；若离线不可拉取，改用系统命令实现并在文档注明
- **不做数据迁移**：新库由迁移脚本在 AppData 首启创建，与老库完全隔离
