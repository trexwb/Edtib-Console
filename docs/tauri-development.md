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
npm run dev                # 仅启动前端 dev server（http://localhost:1430）
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

前端 dev 端口：**1430**，HMR **1431**（区别于 books 项目的 1420/1421）。

---

## 3. 目录速览

```
console/
├── index.html                   # Vite 入口 HTML
├── package.json                 # 前端依赖与脚本（dev / build / preview / tauri）
├── vite.config.ts               # Vite 配置（固定端口 1430，忽略 src-tauri）
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

1. 进程环境变量（`tauri dev` 下可直接 `EDTIB_APP_SECRET=… npm run tauri dev`）；
2. 密钥文件：`EDTIB_ENV_FILE` 指定的路径，缺省为 `<AppData>/console.env`（`KEY=VALUE`，支持 `#` 注释与成对引号）；
3. 无兜底默认值——缺失即**失败关闭**（启动打 `ERROR` 日志，所有 `proxy_request` 直接拒绝）。

> 打包态 macOS 从 Finder 启动不会继承 shell 环境变量，因此发布机必须部署 `console.env`；
> 变量清单与含义见仓库根 `.env.example`（`VITE_*` 为前端构建期，`EDTIB_*` 为 Rust 运行期）。
> `VITE_APP_ID` / `VITE_APP_SECRET` 必须与 `EDTIB_APP_ID` / `EDTIB_APP_SECRET` 同值，否则本地链路验签返回 `4016000305`。

---

## 4. 图标

图标以老项目 `client/console/electron/assets/images/icon.png` 为源图，用 Tauri CLI 一源多出生成：

```bash
npx tauri icon "/Users/<user>/website/localServer/node/edtib/client/console/electron/assets/images/icon.png"
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
| Rust 单测 | `cd src-tauri && cargo test` | `31 passed; 0 failed` |
| 前端类型检查 | `npm run typecheck` | 无输出，exit 0 |
| 前端生产构建 | `npm run build:check` | 输出 `dist/index.html` 与 `assets/*`（需 `.env.local` 授权码，见 §2 注意事项） |
| 密钥注入自检 | 启动后看日志 | 无「本地链路密钥未配置或长度非法」`ERROR`；出现该日志说明 `EDTIB_APP_*` / `console.env` 缺失，此时所有转发请求被拒绝 |
| Tauri 环境信息 | `npm run tauri -- info` | 正确识别 Rust / Node / CLI 版本 |
| 开发运行 | `npm run tauri dev` | 弹出「EDTIB控制中台」窗口（1430 端口 dev server）；设置 → 检查更新页不再报 `electronAPI` 未定义 |

