# 开发与发版手册（Tauri v2）

面向 EDTIB控制中台 Tauri 版。架构与迁移映射见 [`electron-to-tauri.md`](./electron-to-tauri.md)。

---

## 1. 环境要求

| 组件 | 本机已验证版本 | 说明 |
| --- | --- | --- |
| Node.js | v24.21.0 | 前端构建与 Tauri CLI 运行环境 |
| npm | 11.19.0 | 包管理 |
| Rust（rustc / cargo） | 1.97.1 | `rust-version` 声明为 1.90 |
| Tauri CLI | 2.12.0 | 项目内 devDependency（`@tauri-apps/cli`），**未做全局安装**，一律用 `npm run tauri` / `npx tauri` 调用 |
| Xcode Command Line Tools | 已安装（cc/clang 可用） | macOS 构建 Rust 依赖所需 |

> 若终端提示 `node` / `cargo` 不存在，通常是版本管理器未加载 PATH：
> Node 在 `~/.nvm/versions/node/<ver>/bin`，Cargo 在 `~/.cargo/bin`。

---

## 2. 常用命令

```bash
npm install                # 安装前端依赖（Vue / Vite / TS）与 Tauri CLI
npm run dev                # 仅启动前端 dev server（http://localhost:1430）
npm run tauri dev          # 启动完整桌面应用（前端 + Rust 热重载）
npm run build              # 前端类型检查 + 生产构建（输出 dist/）
npm run tauri build        # 打包安装包（产物在 src-tauri/target/release/bundle/）
npx tauri icon <源图.png>   # 由 1024×1024 源图重新生成全套图标
npx tauri signer generate -w ~/.tauri/edtib-console.key   # 生成 Tauri minisign 更新签名密钥对
cd src-tauri && cargo check   # 快速校验 Rust 侧与 tauri.conf.json 配置
```

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
└── src-tauri/                   # Rust 侧
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json          # 主配置（identifier / 窗口 / bundle / updater）
    ├── tauri.macos.conf.json    # macOS 覆盖：app+dmg、ad-hoc 签名
    ├── tauri.windows.conf.json  # Windows 覆盖：nsis
    ├── capabilities/default.json# 权限能力集（含 updater:default）
    ├── icons/                   # 应用图标（由老项目 icon.png 生成）
    ├── migrations/              # SQL 迁移（0001_init.sql 为占位）
    └── src/
        ├── main.rs              # 进程入口
        ├── lib.rs               # 插件注册、状态托管、命令挂载
        ├── state.rs             # 全局托管状态（AppState）
        ├── error.rs             # AppError / AppResult
        ├── commands/            # 按业务域拆分的 Tauri 命令
        ├── db/                  # rusqlite 连接 + 迁移执行器
        └── schedule/            # 定时任务注册与调度
```

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
| Rust 侧编译与配置校验 | `cd src-tauri && cargo check` | `Finished`，无 error |
| 前端类型检查与构建 | `npm run build` | 输出 `dist/index.html` 与 `assets/*` |
| Tauri 环境信息 | `npm run tauri -- info` | 正确识别 Rust / Node / CLI 版本 |
| 开发运行 | `npm run tauri dev` | 弹出「EDTIB控制中台」窗口（1430 端口 dev server） |

