# 开发与发版手册（Tauri v2）

面向 EDTIB控制中台 Tauri 版。架构与迁移映射见 [`electron-to-tauri.md`](./electron-to-tauri.md)。

---

## 1. 环境要求

| 组件 | 本机已验证版本 | 说明 |
| --- | --- | --- |
| Node.js | v24.19.0 | 前端构建与 Tauri CLI 运行环境 |
| npm | 11.17.0 | 包管理 |
| Rust（rustc / cargo） | 1.98.0 | `rust-version` 声明为 1.90 |
| Tauri CLI | 2.12.1 | 项目内 devDependency（`@tauri-apps/cli`），**未做全局安装**，一律用 `npm run tauri` / `npx tauri` 调用 |
| Xcode Command Line Tools | 已安装（cc/clang 可用） | macOS 构建 Rust 依赖所需 |

> 若终端提示 `node` / `cargo` 不存在，通常是版本管理器未加载 PATH：
> Node 在 `~/.nvm/versions/node/<ver>/bin`，Cargo 在 `~/.cargo/bin`。

---

## 2. 常用命令

```bash
npm install                # 安装前端依赖（Vue / Vite / TS）与 Tauri CLI
npm run dev                # 仅启动前端 dev server（http://localhost:9002）
npm run tauri dev          # 启动完整桌面应用（前端 + Rust 热重载）
npm run typecheck            # 仅类型检查（vue-tsc --noEmit）
npm run build                # 前端生产构建（vite build，输出 dist/；不含类型检查）
npm run build:check          # 类型检查 + 生产构建
npm run tauri build          # 打包安装包（产物在 src-tauri/target/release/bundle/）
npx tauri icon <源图.png>     # 由 1024×1024 源图重新生成全套图标
npx tauri signer generate -w ~/.tauri/edtib-console.key   # 生成 Tauri minisign 更新签名密钥对
cd src-tauri && cargo check   # 快速校验 Rust 侧与 tauri.conf.json 配置
cd src-tauri && cargo test    # Rust 单测（当前 31 项）
```

> ⚠️ `npm run build` 依赖商业模板（`Admin` / `vite-plugin-unplugin`）的授权码：
> `VITE_APP_GITHUB_USER_NAME` / `VITE_APP_SECRET_KEY` 缺失时，插件链仍会完整注册（迁移期已修复
> 「缺授权码直接 `return undefined` 导致构建崩溃」的问题），但授权校验会中断产物生成且退出码仍为 0，
> 因此**必须以 `dist/` 是否产出为准**，不能只看退出码。发布前在 `.env.local` 补入购买的 key。

前端 dev 端口：**9002**（与 docker nginx `/console/` 代理口一致，strictPort；books 项目仍为 1420）。

---

## 3. 目录速览

```
console/
├── index.html                   # Vite 入口 HTML
├── package.json                 # 前端依赖与脚本（dev / build / preview / tauri）
├── vite.config.ts               # Vite 配置（固定端口 9002，忽略 src-tauri）
├── tsconfig.json                # 前端 TS 配置
├── tsconfig.node.json
├── dist/                        # 前端构建输出（`frontendDist: ../dist` 指向此处）
├── src/                         # 前端源码（Vue3 + Vite + TS）
│   └── bridge/                  # window.electronAPI 桥接（channels / types / index）
└── src-tauri/                   # Rust 侧
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json          # 主配置（identifier / 窗口 / bundle / updater）
    ├── tauri.macos.conf.json    # macOS 覆盖：app+dmg、ad-hoc 签名
    ├── tauri.windows.conf.json  # Windows 覆盖：nsis
    ├── capabilities/default.json# 权限能力集（含 updater:default）
    ├── icons/                   # 应用图标（由老项目 icon.png 生成）
    ├── migrations/              # SQL 迁移（0001_init.sql ~ 0019_servers.sql）
    └── src/
        ├── main.rs              # 进程入口
        ├── lib.rs               # 插件注册、状态托管、25 个命令挂载
        ├── config.rs            # 凭证与密钥：环境变量 / console.env（源码零密钥）
        ├── crypt.rs             # md5 / sha256 / aes-256-cbc
        ├── paths.rs             # AppData / 文档目录解析与越权防护
        ├── update.rs            # tauri-plugin-updater 下载-安装两段式
        ├── state.rs             # 全局托管状态（AppState）
        ├── error.rs             # AppError / AppResult
        ├── response.rs          # Envelope 统一信封
        ├── commands/            # 按业务域拆分的 Tauri 命令（app / db / fs / system / schedule / proxy）
        ├── models/              # 12 表白名单注册表 + cast
        ├── db/                  # rusqlite 连接 + 查询执行器 + 迁移 + 种子
        ├── proxy/               # 本地链路鉴权 + 重加密 + 网关转发
        └── schedule/            # 定时任务注册与调度
```

---

## 3.1 运行时密钥与配置注入

Rust 侧**源码不含任何密钥**（AGENTS §6.3）。三类注入源，优先级从高到低：

1. 进程环境变量（`tauri dev` 下可直接 `TAURI_APP_SECRET=… npm run tauri dev`）；
2. 密钥文件：`EDTIB_ENV_FILE` 指定的路径，缺省为 `<AppData>/console.env`（`KEY=VALUE`，支持 `#` 注释与成对引号）；
3. 无兜底默认值——缺失即**失败关闭**（启动打 `ERROR` 日志，所有 `proxy_request` 直接拒绝）。

> 打包态 macOS 从 Finder 启动不会继承 shell 环境变量，因此发布机必须部署 `console.env`；
> 变量清单与含义见仓库根 `.env.example`（`VITE_*` 为前端构建期，`EDTIB_*` 为 Rust 运行期）。
> `VITE_APP_ID` / `VITE_APP_SECRET` / `VITE_APP_IV` 必须与**同一环境文件**里的
> `TAURI_LINK_ID` / `TAURI_LINK_SECRET` / `TAURI_LINK_IV` 同值（`npm run tauri:dev` 由
> `scripts/with-tauri-env.mjs` 自动映射），否则本地链路验签返回 `4016000305`。
> 注意口径：`TAURI_LINK_*` 是「渲染层 ↔ tauri」的本地链路密钥，`TAURI_APP_*` 是
> 「tauri → 后端网关」的出站凭证，两组不是同一对密钥。

### 3.1.1 两套密钥的边界

| 键位 | 用途 | 所在链路 | 是否进 Web 产物 |
| --- | --- | --- | --- |
| `VITE_APP_ID/SECRET/IV` ↔ `TAURI_LINK_ID/SECRET/IV` | 本地链路：渲染层与 Rust 之间的验签与加解密 | 渲染层 ↔ Rust（不出机器） | **是**（按设计：Rust 要用同一对密钥验通前端请求） |
| `TAURI_APP_ID/SECRET/IV` + `TAURI_APP_BASE_URL` | 出站网关：Rust 调 gateway 的凭证与地址 | Rust → gateway | **否**（`npm run scan:dist` 命中即构建失败） |

`TAURI_LINK_*` 会被编译进渲染层产物，因此**本地链路不是保密边界**；`TAURI_APP_*` 只从
进程环境或 `console.env` 读入。两组密钥不要互相复制。

### 3.1.2 出网地址与跨环境隔离（2026-10 加固）

| 规则 | 表现 |
| --- | --- |
| 源码不内置任何 dev/prod 网关地址 | `TAURI_APP_BASE_URL` 与本地 `secrets.app_url` 都缺失时，转发明确失败：「缺少出站网关地址」 |
| 配置地址优先，表内地址仅兜底 | 两者同时存在必须同源，否则「配置网关地址…与本地 secrets.app_url…不一致，已拒绝转发」（防止 `db_update` 改写表内地址，把带签名凭证的请求带到任意主机） |
| 正式包出网白名单 | release 构建只允许 `config::ALLOWED_GATEWAY_ORIGINS` 内的自有 https 域名；跨主机 3xx 重定向同样拒绝跟随 |
| 开发/测试构建反向隔离 | `tauri:dev`（development）默认拒绝把请求带到正式网关 `gateway.edtib.com`，确需联调须显式 `EDTIB_ALLOW_PROD_EGRESS=1` |
| 正式环境文件不被调试链路读取 | `npm run tauri:dev` 固定读 `.env.test`；`EDTIB_TAURI_ENV=.env.production` 会被拒绝，除非 `EDTIB_TAURI_ALLOW_PROD_ENV=1` |
| 本地文件读取边界 | `fs_read_file` / `fs_write_file` / `fs_delete_file` 拒绝 `.env` / `.db*` / `.sqlcipher-key`，渲染层无法再经文件命令读出密钥文件或本地库 |

### 3.1.3 凭证方案的结论

本节只解决「暴露面收口」，不解决「对本机用户保密」——后者在客户端长期持有 `TAURI_APP_SECRET`
的前提下不可能成立（明文 `console.env`、本地 `secrets` 表、进程内存、调试器四条路径本机可达，
`strip`/落库加密/改名只提高成本）。方案 A（服务端代理）/ B（短时凭证）/ C（客户端持有）的
逐项对比、服务端已具备的能力与缺口、以及实施顺序，见
`../books/docs/security/tauri-secret-hardening.md` §9；console 与 books 共用同一结论。

要点：AI/短信/OSS 这类真第三方在网关侧已经是方案 A（密钥只在服务端，客户端只带用户令牌）；
桌面主链路仍是方案 C；根治方向是方案 B（设备鉴权换短时签名密钥），需要后端排期与签名协议
双改，客户端仓库不得单方面变更（本轮已保持协议原样）。

---

## 4. 图标

图标以老项目 `client/console/electron/assets/images/icon.png` 为源图，用 Tauri CLI 一源多出生成：

```bash
npx tauri icon "../client/console/electron/assets/images/icon.png"
```

生成 `src-tauri/icons/` 下的 `icon.icns`（macOS）、`icon.ico`（Windows）、各尺寸 PNG 与 Windows
Square/Store 系列资源。`icons/android`、`icons/ios` 已删除——本项目不发布移动端。

---

## 5. 在线更新（tauri-plugin-updater）

### 5.1 机制

- 更新清单：GitHub Release 的 `latest.json`
  （endpoint：`https://github.com/trexwb/Edtib-Console/releases/latest/download/latest.json`）。
- 校验方式：**Tauri 自有 minisign 密钥对**，与 Apple/Windows 代码签名证书无关。
- `tauri.conf.json` 中 `bundle.createUpdaterArtifacts: true`，构建时产出：
  - macOS：`*.app.tar.gz` + `*.app.tar.gz.sig`
  - Windows：`*-setup.exe` + `.sig`
- 公钥已写入 `tauri.conf.json` 的 `plugins.updater.pubkey`；**私钥不入库**（`.gitignore` 已忽略 `*.key`）。

### 5.2 密钥管理

密钥对生成于本机 `~/.tauri/edtib-console.key`（私钥）与 `~/.tauri/edtib-console.key.pub`（公钥）。
私钥需妥善离线保管——**一旦丢失，已安装的老用户将无法再收到更新**。

GitHub 仓库需配置两个 Secrets（Settings → Secrets and variables → Actions）：

| Secret | 内容 |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | 私钥文件**内容**（或文件路径）；CI 中推荐直接放内容 |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 私钥口令；生成时未设口令则填空字符串 |

> `GITHUB_TOKEN` 由 GitHub 自动注入，无需手动配置；若 Release 步骤报
> “Resource not accessible by integration”，请在仓库 Actions 设置中把 Workflow permissions 改为
> “Read and write permissions”。

### 5.3 发版流程

```bash
# 1. 更新版本号（src-tauri/tauri.conf.json 的 version，同时也用于 tag 名）
# 2. 提交并打 tag
git tag v1.0.0
git push origin v1.0.0
# 3. GitHub Actions（.github/workflows/release.yml）自动：
#    macOS(arm64) / macOS(x64) / Windows(x64) 三路并行构建 → 上传安装包与 .sig → 生成 latest.json → 创建 Release
```

也可在 Actions 页面手动触发（`workflow_dispatch`）。

---

## 6. macOS 无苹果证书的说明

由于不再持有 Apple 开发者证书，macOS 侧使用 ad-hoc 签名（`tauri.macos.conf.json` 中
`signingIdentity: "-"`）。这带来两点用户侧表现：

1. 首次打开 `.dmg` 内的应用时，Gatekeeper 会提示「无法验证开发者」，
   用户需右键「打开」或在「系统设置 → 隐私与安全性」中放行；
2. 应用内**在线更新链路不受影响**：updater 校验的是 minisign 签名，而不是 Apple 公证。

后续若重新取得证书，只需在 CI 中注入 Apple 相关 Secrets 并在 `tauri.macos.conf.json` 中
改为真实签名身份，无需改动其他代码。

---

## 7. 自检清单

| 检查项 | 命令 | 期望 |
| --- | --- | --- |
| Rust 侧编译与配置校验 | `cd src-tauri && cargo check --all-targets` | `Finished`，无 error（存量 warning 为未引用的兼容项） |
| Rust 单测 | `cd src-tauri && cargo test` | `39 passed; 0 failed`（含出网地址、头剥离、密钥文件、时钟偏移等加固用例） |
| 前端类型检查 | `npm run typecheck` | 无输出，exit 0 |
| 前端生产构建 | `npm run build:check` | 输出 `dist/index.html` 与 `static/*`，末尾自动跑产物密钥扫描（需 `.env.local` 授权码，见 §2 注意事项） |
| Web 产物密钥扫描 | `npm run scan:dist` | `结论：Web 产物未检出任一出站网关凭证…`，exit 0；命中 `TAURI_APP_*` 即 exit 1 |
| 安装包密钥扫描 | `npm run scan:installer` | 打包后扫描 `src-tauri/target/release/bundle`，`TAURI_APP_*` 命中即 exit 1（`.dmg` 为压缩容器，需挂载后再扫） |
| 密钥注入自检 | 启动后看日志 | 无「本地链路密钥未配置或长度非法」`ERROR`；出现该日志说明 `TAURI_LINK_*`（或 `console.env`）缺失，此时所有转发请求被拒绝 |
| 出站地址自检 | 首次 `proxy_request` | 若日志/响应为「缺少出站网关地址」「配置网关地址…与本地 secrets.app_url…不一致」「开发/测试构建拒绝访问正式网关」，说明环境口径未对齐，按 §3.1.2 修正而不是改代码 |
| Tauri 环境信息 | `npm run tauri -- info` | 正确识别 Rust / Node / CLI 版本 |
| 开发运行 | `npm run tauri dev` | 弹出「EDTIB控制中台」窗口（9002 端口 dev server）；设置 → 检查更新页不再报 `electronAPI` 未定义 |
| 桌面联调 | `npm run tauri:dev` | 读 `.env.test` 注入；缺 `TAURI_LINK_*` 或长度非 32/16 时脚本直接 exit 1；指向 `.env.production` 需 `EDTIB_TAURI_ALLOW_PROD_ENV=1` |

