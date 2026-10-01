# Electron → Tauri 迁移说明（架构与目录映射）

> 目的：把 EDTIB控制中台从 Electron 迁移到 Tauri v2，摆脱「必须持有 Apple 开发者证书才能签名分发」
> 这条硬约束，同时获得 GitHub Actions 多平台自动打包与内置在线更新能力。
>
> 状态：**骨架阶段**。本仓库当前只有项目骨架与配置，尚未迁移任何 web 业务代码。
>
> - 老项目（只读参考，不做任何修改）：`/Users/wbtrex/website/localServer/node/edtib/client/console`
>   - Electron 主程序：`.../client/console/electron`
>   - 前端（Vue3 + Vite）：`.../client/console/web`
> - 新项目（本仓库）：`/Users/wbtrex/website/localServer/node/edtib/console`
> - 同仓已完成迁移的参照项目：`/Users/wbtrex/website/localServer/node/edtib/books`

---

## 1. 基本标识

| 项 | 老项目（Electron） | 新项目（Tauri v2） |
| --- | --- | --- |
| 产品名 | `EDTIB控制中台`（productName） | `EDTIB控制中台`（`productName`，保持一致） |
| bundle identifier | `com.edtib.console`（electron-builder `appId`） | `com.edtib.console`（`identifier`，保持一致） |
| 可执行文件名 | `EDTIB控制中台`（由 productName 派生） | `edtib-console`（`mainBinaryName`，ASCII 名更利于 CI/命令行） |
| 版本号 | 1.0.19 | 1.0.0（重新起版，老版本全部放弃） |
| Rust crate / lib 名 | — | `edtib-console` / `edtib_console_lib` |
| 前端 dev 端口 | 9002 | **1430**（HMR 1431），与 books 的 1420/1421 错开 |

> Tauri 的 `productName` 支持中文并会用于安装包与窗口标题；`mainBinaryName` 单独指定为 ASCII，
> 避免中文可执行文件名在 Windows CI 与命令行环境下的转义问题。

---

## 2. 关键决策

### 2.1 老项目 `electron/` 内嵌的 Express + Knex + SQLite 本地服务，改由 Rust 原生实现

老项目形态：Electron 主进程里 `knex` 起一个 SQLite 连接，同时用 `express` 暴露一组 HTTP 路由
（`electron/src/route`），渲染层通过 HTTP 请求这些接口读写本地数据；`node-schedule` 跑定时任务；
`electron/certs` 下还带着自签证书（HTTPS + 忽略证书错误）。

新项目形态：

| 老实现 | 新实现 |
| --- | --- |
| `express` 路由（`electron/src/route/*`） | `#[tauri::command]`（`src-tauri/src/commands/*`），前端 `invoke()` 直调 |
| `knex` + `sqlite3`（原生模块，需 `electron-rebuild`） | `rusqlite`（`features = ["bundled"]`，SQLite 源码编译进二进制） |
| Knex 迁移 `.ts`（`electron/src/migrations/*`） | 纯 SQL 迁移（`src-tauri/migrations/*.sql`），由 `src-tauri/src/db` 顺序执行并记录到 `_schema_migrations` |
| `node-schedule`（`electron/src/schedule/*`） | `tokio::time` 调度 + 任务注册表（`src-tauri/src/schedule/mod.rs`） |
| HTTPS + 自签证书 + 忽略证书错误 | 无本地 HTTP 端口，走 Tauri IPC（进程内） |
| `electron/src/cast/*`（类型转换） | Rust `serde` 序列化 + `From/Into` 转换 |

决策理由：

1. **职责边界小、Rust 侧可直接覆盖**：该本地服务本质是「SQLite 读写 + 定时任务 + 少量上游同步」，
   `rusqlite` 官方维护、`bundled` 特性把 SQLite 静态编进二进制，能力等价且无外部运行时依赖。
2. **消除本地端口与自签证书**：不再监听 HTTP 端口，攻击面随之消失，也就无需携带 `certs/privkey.key`
   这类敏感文件与「忽略证书错误」的兜底逻辑。
3. **一次性解决原生模块与 ABI 绑定**：老项目依赖 `sqlite3` / `node-abi` / `electron-rebuild` /
   `@electron/fuses`，每次 Electron 升级都要重编；Rust 侧编译期即静态链接，无此环节。
4. **与更新链路天然对齐**：Rust 逻辑随主二进制一起被 Tauri 的 minisign 签名覆盖校验，
   不存在「壳更新了、sidecar 没更新」的版本漂移。

> 业务表结构（`accounts / customers / products / standards / formulas / serials ...` 共 18 个 Knex 迁移）
> 属于纯 SQL 翻译工作，将在业务迁移阶段按 `NNNN_描述.sql` 逐个落到 `src-tauri/migrations/`。
>
> 另注：SQLite 能力**保留**，但**不作为**本地业务数据缓存使用，用途限定见 2.4。

### 2.2 为什么**不采用** Node sidecar 方案

Tauri 支持把任意可执行文件作为「sidecar」随包分发，理论上可以原样搬运 Node 版 Express 服务。
经过权衡后**不采用**，理由如下：

| 维度 | Node sidecar | Rust 原生实现（本方案） |
| --- | --- | --- |
| 分发体积 | 需为每个平台×架构准备 Node 运行时或打包 `node_modules`（含 `sqlite3` 原生模块），安装包从 MB 级涨到几十~上百 MB | 只增加静态链接的 SQLite，体积增量极小 |
| 跨平台维护 | 每平台/架构单独出二进制，需处理 `node-abi` 与 Node 版本锁定（老项目 `package.json` 里的 `node-abi`、`electron-rebuild` 正是这类成本的产物） | 一套 Rust 代码交叉编译，`tauri-action` 矩阵直接产出 |
| 进程与生命周期 | 需要管理子进程启动/退出、随机端口分配与冲突、崩溃自愈；老项目 README 已记录过「win 多次启动时出现服务未退出」的问题 | 同进程内，无端口、无子进程泄漏；单实例由 `tauri-plugin-single-instance` 统一保证 |
| 安全面 | 仍需本地 HTTP/stdio 通道，且 sidecar 二进制是「第二个需要被信任与校验的执行体」 | 只有主进程，更新签名覆盖面完整 |
| 更新一致性 | 应用与 sidecar 两条独立的版本/校验链路 | 单二进制，一条链路 |
| 复用老代码 | 可近似原样搬运 TypeScript 服务 | 需把服务逻辑翻译为 Rust（本次改动量的主要来源） |

**代价与取舍**：Rust 侧确实需要重写这部分服务逻辑（SQL 与表结构可机械翻译，业务规则需逐条核对）。
由于需求已明确「老版本可以全部放弃、从零开始」，没有必须复用 Node 代码的强约束，因此选择长期维护成本
更低的 Rust 原生实现。

**在什么情况下应当重新考虑 sidecar**：若后续出现「必须复用 Node 生态专属依赖」的场景
（例如重量级爬虫/浏览器自动化、Node 独有的文档或媒体处理库），且该能力无法在 Rust 侧等价实现，
再评估以 sidecar 承载这部分独立能力——届时它只会是**局部补充**，而不是承载数据库与路由的主干。

### 2.3 其余决策

| 决策 | 结论 | 原因 |
| --- | --- | --- |
| Apple 代码签名 / 公证 | **不使用**，macOS 走 ad-hoc 签名（`signingIdentity: "-"`） | 已无苹果证书；CI 因此不需要任何 Apple Secrets 凭据 |
| macOS 打包目标 | `app` + `dmg` | Tauri v2 内置 `BundleType` 不含 `zip`（老项目 Electron 曾用 zip 做 macOS 升级包），升级包由 updater 的 `.app.tar.gz` 承担 |
| Windows 打包目标 | `nsis` | 与老项目一致；`installMode: perMachine`、中文/英文语言选择器保留老安装体验 |
| 在线更新实现 | `tauri-plugin-updater` + GitHub Release 的 `latest.json` | 取代 `electron-updater` + 自建 `static.edtib.com` 更新源；不再依赖自签证书 |
| 更新签名密钥 | Tauri 自带 **minisign** 密钥对（`tauri signer generate`） | 与平台证书解耦，私钥仅存 CI Secrets |
| 代码混淆 / Electron fuses | **移除** | 属 Electron 特有加固手段；Tauri 侧为编译后的原生二进制，不再需要（老项目 `scripts/obfuscate.js`、`scripts/fuses.js` 随之废弃） |
| 定时任务的启用状态 | 骨架阶段**全部 `enabled: false`** | 避免骨架在没有真实业务逻辑时误发网络请求 |
| 本轮范围 | 只搭骨架与配置，**不迁移** `client/console/web` 的业务代码 | 业务迁移另立阶段 |
| 前端工程布局 | **平铺仓库根目录**，不设 `web/` 子目录；`frontendDist` 为 `../dist` | 与同仓前台 `books` 的 Tauri v2 骨架保持完全一致，命令与依赖口径统一（`npm run tauri dev` / `tauri build`） |
| SQLite 的定位 | 能力**保留**，用于未来处理 AI 与异步事务；**不作为**本地业务数据缓存 | 本机不承担业务数据的缓存职责；保留的只是 SQLite 能力本身（详见 2.4） |

---

### 2.4 SQLite 的定位：保留能力，但不作为本地业务数据缓存

**决策**：SQLite 能力**保留**，用于未来处理 AI 相关数据与异步事务；**不作为**本地业务数据的缓存使用。

拆开说是两件事：

1. **能力保留**：`rusqlite`（`bundled`）、`src-tauri/src/db` 的连接与迁移执行器、
   `src-tauri/migrations/*.sql` 链路全部保留在骨架中，不删除、不降级。后续
   与 AI、异步事务相关的本地存储需求，继续复用这套能力实现。
2. **用途限定——不做本地业务数据缓存**：不把 SQLite 当作本机业务数据的缓存层，
   不在本机落库缓存业务数据。`database` 仍然打开、迁移仍然执行，但本轮及后续
   的用途边界以「AI / 异步事务」为准，而不是「缓存业务数据」。

需要区分的是：这里的「不做缓存」限定的是**用途**，不是否定 SQLite 本身的存在价值——
它与 2.1 的「Rust 原生实现替代 Express + Knex」并不冲突，2.1 解决的是**用什么实现**，
本节限定的是**这份能力用来做什么**。

落地约束（写注释/文档时同步体现）：

| 文件 | 体现方式 |
| --- | --- |
| `src-tauri/src/db/mod.rs` | 模块级 doc 与 `Database` 结构体注释写明定位与用途限定 |
| `src-tauri/src/state.rs` | `AppState.db` 字段注释写明定位与用途限定 |
| `src-tauri/src/lib.rs` | 骨架模块划分说明中注明 `db` 的定位 |
| `src-tauri/migrations/0001_init.sql` | 迁移头部注释写明后续迁移以 AI / 异步事务结构为准 |
| `README.md` | 「迁移动因」与「技术栈」说明中注明该定位 |

---

## 3. 目录映射

### 3.1 顶层布局

```
老：client/console/                     新：edtib/console/
├── electron/          (Electron 主程序) ├── src-tauri/        (Rust 侧：全部本地能力)
│   ├── src/                            │   ├── src/          (main.rs / lib.rs / commands / db / schedule / error / state)
│   ├── assets/                         │   ├── migrations/   (SQL 迁移)
│   ├── certs/                          │   ├── capabilities/ (权限能力集)
│   ├── scripts/                        │   ├── icons/        (应用图标)
│   └── output/view/  (前端构建产物)     │   ├── Cargo.toml
└── web/               (Vue3 前端源码)   │   ├── tauri.conf.json
                                        │   ├── tauri.macos.conf.json / tauri.windows.conf.json
                                        │   └── build.rs
                                        ├── index.html               (前端工程平铺仓库根目录)
                                        ├── vite.config.ts           (固定端口 1430)
                                        ├── tsconfig.json / tsconfig.node.json
                                        ├── package.json / package-lock.json
                                        ├── src/            (Vue3 前端源码，本轮仅骨架)
                                        ├── dist/           (前端构建产物，frontendDist)
                                        ├── docs/
                                        └── .github/workflows/
```

### 3.2 文件级映射

| 老项目路径 | 新项目路径 | 说明 |
| --- | --- | --- |
| `electron/src/main.ts` | `src-tauri/src/lib.rs`（`run()` + `setup`） | 应用装配：窗口、插件、状态托管、数据库初始化、调度启动 |
| `electron/src/index.ts` | `src-tauri/src/main.rs` | 进程入口（Windows release 下隐藏控制台窗口） |
| `electron/src/preload.ts` | `src/bridge/index.ts`（`setupBridge()`） | Tauri 无 preload/contextBridge；渲染层自建同名 `window.electronAPI` 门面，内部转 `invoke()` |
| `electron/src/route/index.ts` | `src-tauri/src/commands/mod.rs` + `commands/*.rs` | Express 路由 → 按业务域拆分的命令模块 |
| `electron/src/route/middleware.ts` | `src-tauri/src/proxy/middleware.rs` + `error.rs` + capabilities | 本地链路鉴权（`App-Id` / `App-Nonce` / `App-Secret`，错误码逐字对齐）→ Rust 侧校验 + 统一 `AppError` + 权限能力集 |
| `electron/src/controller/request.ts` | `src-tauri/src/proxy/request.rs` + `commands/proxy.rs` | 重加密 → `x-sign` → reqwest 转发 → 响应解密 → 信封 |
| `electron/src/config/db.ts`、`knexfile.ts` | `src-tauri/src/db/mod.rs` | 数据库连接与迁移执行器 |
| `electron/src/config/index.ts` | `src-tauri/src/config.rs` + `state.rs` + `commands/app.rs` | 运行时配置与凭证：`cryptSecrets()` → `EDTIB_*` 环境变量 / `<AppData>/console.env`（源码零密钥）；托管状态 + `app_info` 自检命令 |
| `electron/src/config/cryptTool.ts` | `src-tauri/src/crypt.rs` | `md5` / `sha256` / `aes-256-cbc` + hex，解密自适应 `iv:cipher` 与固定 IV 两种历史格式；`defaultKey` 改由 `EDTIB_FIELD_CRYPT_*` 提供 |
| `electron/src/model/*.ts` | `src-tauri/src/models/` + `db/` + `commands/*.rs` | 数据模型 → 12 表白名单注册表 + 查询执行器 + 命令出入参 |
| `electron/src/migrations/*.ts`（18 个 Knex 迁移） | `src-tauri/migrations/*.sql`（`0001_init.sql` ~ `0019_servers.sql`） | 迁移脚本翻译为纯 SQL，逐表对应 |
| `electron/src/seeds/*.ts` | `src-tauri/src/db/seed.rs` | 种子数据随 `Database::open` 执行，幂等判据为「业务表空」 |
| `electron/src/schedule/index.ts` + `schedule/components/*` | `src-tauri/src/schedule/mod.rs` | node-schedule → tokio 调度 + 任务注册表 |
| `electron/src/cast/*.ts` | serde 序列化 + Rust `From/Into` | 类型转换 |
| `electron/src/helper/*` | `src-tauri/src/`（计划 `helper.rs`，待迁移） | 工具函数 |
| `electron/src/view/`、`electron/output/view/` | 仓库根 `dist/`（`frontendDist`） | 前端构建产物目录 |
| `electron/assets/images/icon.png` | `src-tauri/icons/*`（`npx tauri icon` 生成） | 图标一源多出：`.icns` / `.ico` / PNG 全尺寸 |
| `electron/assets/splash.html` | 待定（Tauri 可用 `splashscreen` 窗口实现） | 启动闪屏 |
| `electron/certs/*` | —（删除） | 不再需要本地 HTTPS 自签证书 |
| `electron/scripts/build.js`（打包编排） | `.github/workflows/release.yml` | 打包编排交给 CI |
| `electron/scripts/obfuscate.js` | —（删除） | 代码混淆不再需要 |
| `electron/scripts/fuses.js` | —（删除） | Electron fuses 不适用于 Tauri |
| `electron/package.json` 的 `build` 段（electron-builder） | `src-tauri/tauri.conf.json` + `tauri.<platform>.conf.json` | 打包配置迁移 |
| `electron-updater` + `build.publish`（generic 指向 `static.edtib.com`） | `tauri-plugin-updater` + GitHub Release `latest.json` | 更新链路迁移 |
| `web/`（老前端源码，构建输出到 `../electron/output/view`） | 仓库根 `index.html` / `src/` / `vite.config.ts` / `tsconfig*.json` / `package.json`（构建输出到根 `dist/`） | 前端工程整体平移并**上移到仓库根目录**，与 books 布局一致；业务代码待迁移 |

### 3.3 新增（老项目没有的）结构

| 路径 | 作用 |
| --- | --- |
| `src-tauri/capabilities/default.json` | Tauri v2 权限能力集：`core:default`、`opener:default`、`log:default`、`process:allow-restart`、`updater:default` |
| `src-tauri/tauri.macos.conf.json` | macOS 平台覆盖：`targets: ["app","dmg"]`、ad-hoc 签名、最低系统版本 |
| `src-tauri/tauri.windows.conf.json` | Windows 平台覆盖：`targets: ["nsis"]`、perMachine 安装、中英双语安装器 |
| `src-tauri/migrations/` | Rust 侧 SQL 迁移目录（含 `_schema_migrations` 幂等记录表） |
| `.github/workflows/release.yml` | 多平台自动打包 + 发 Release + 生成 `latest.json` |
| `docs/` | 迁移说明（本文）与开发/发版手册 |

---

## 4. 运行期架构对照

```
Electron（老）
  渲染层(Vue) ──HTTP──> Express(主进程) ──Knex──> SQLite 文件
                                └─ node-schedule 定时任务
                                └─ electron-updater（自建更新源）

Tauri（新）
  WebView(Vue) ──invoke(IPC)──> Rust 命令层 commands/*  ──rusqlite──> SQLite 文件(AppData)
                                        └─ tokio 调度（schedule）
                                        └─ tauri-plugin-updater（GitHub Release latest.json）
```

差异要点：

1. **无本地网络端口**：老项目前端要经 HTTP 访问本地服务，新项目是进程内 IPC。
2. **无 asar / 无 JavaScript 主进程**：Rust 编译为原生二进制，前端产物由 `frontendDist` 直接内嵌。
3. **更新鉴权换轨**：从「Electron 平台签名 + 自建更新源」变为「minisign 签名 + GitHub Release 清单」。

---

## 5. 迁移待办（后续阶段）

- [x] 把 `client/console/web` 的业务代码迁入仓库根 `src/`（Vue3 + Vite 工程结构、路由、状态管理、组件库）。
- [x] 把 18 个 Knex 迁移翻译为 `src-tauri/migrations/*.sql`，并补齐种子数据（`db/seed.rs`）。
- [x] 按业务域补齐 `commands/`（db / fs / system / app / schedule / proxy 共 25 个命令）。
- [x] 迁移 `cryptTool` 加解密逻辑到 Rust（`crypt.rs`），并核对与后端的协议一致性。
- [x] 落地定时任务真实逻辑（心跳、证书下载、更新检查）。
- [x] 应用内更新 UI（`views/settings/update.vue` 经 `src/bridge` 调 `check_update` / `confirm_update` / `restart_app`）。
- [ ] CI 首次发版演练：配置 Secrets → 打 tag → 校验 Release 资产与 `latest.json`。
- [ ] 前端密钥治理：`VITE_APP_*` 仍随构建产物分发，待 `offline-and-proxy-architecture.md` 6.1 D2/D4 拍板后收敛到 Rust 侧。

---

*（本文件为迁移决策与映射记录，供后续业务迁移阶段对照使用。）*
