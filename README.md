# EDTIB控制中台 — 桌面客户端（Tauri v2）

edtib console 桌面端由 **Electron 迁移至 Tauri v2** 的新项目。
当前仓库仅包含**项目骨架与构建/发版配置**，尚未迁移任何 web 业务代码。

- 老实现（只读参考，不做修改）：`../client/console`（Electron：`electron/` 主程序 + `web/` 前端）
- 前端工程平铺仓库根目录（`index.html` / `src/` / `vite.config.ts` / `package.json` / `dist/`），
  **与同仓前台项目 `../books` 的 Tauri v2 骨架布局完全一致**，不设 `web/` 子目录
- bundle identifier：`com.edtib.console`
- 产品名：EDTIB控制中台
- 可执行文件名：`edtib-console`
- 前端 dev 端口：1430（HMR 1431）

## 迁移动因

1. 已无 Apple 开发者证书，Electron 打包分发受制于平台签名；Tauri 的在线更新使用自有
   **minisign** 密钥对校验，与平台证书解耦。
2. 需要 GitHub Actions 多平台自动打包并发 Release。
3. 老项目 `electron/` 内嵌的 Express + Knex + SQLite 本地服务，改由 Rust 原生实现
   （`rusqlite` + Tauri 命令），**不采用 Node sidecar** —— 理由见
   [`docs/electron-to-tauri.md`](./docs/electron-to-tauri.md)。
4. 骨架**保留 SQLite 能力**，用于未来处理 AI 与异步事务；但它**不作为**本地业务
   数据的缓存使用——本机不承担业务数据的缓存职责。详见
   [`docs/electron-to-tauri.md`](./docs/electron-to-tauri.md) 第 2.4 节。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 桌面运行时 | Tauri v2（Rust） |
| 前端框架 | Vue 3 |
| 构建工具 | Vite 7 + TypeScript 5.9 |
| 本地数据库 | rusqlite（bundled SQLite）+ 自研 SQL 迁移执行器 |
| 定时任务 | tokio 调度 + 任务注册表 |
| 在线更新 | tauri-plugin-updater（GitHub Release `latest.json`） |
| 包管理 | npm |

> **SQLite 定位**：保留 SQLite 能力（用于未来 AI 与异步事务处理），**不作为**本地业务
> 数据缓存使用。详见 [`docs/electron-to-tauri.md`](./docs/electron-to-tauri.md) 第 2.4 节。

## 前置环境

| 组件 | 本机已具备版本 |
| --- | --- |
| Node.js / npm | v24.21.0 / 11.19.0 |
| Rust（rustc / cargo） | 1.97.1 |
| Tauri CLI | 2.12.0（项目内 devDependency，经 `npm run tauri` / `npx tauri` 调用） |

> 若 shell 提示 `node` / `cargo` 不存在，通常是未加载版本管理器 PATH。

## 常用命令

```bash
npm install            # 安装前端依赖（Vue / Vite / TS）与 Tauri CLI

npm run dev            # 仅启动前端 dev server（http://localhost:1430）
npm run tauri dev      # 启动完整桌面应用（前端 + Rust 热重载）

npm run build          # 前端类型检查 + 生产构建（输出 dist/）
npm run tauri build    # 打包安装包（产物见 src-tauri/target/release/bundle/）

npx tauri icon <1024x1024.png>                            # 由源图重新生成全套应用图标
npx tauri signer generate -w ~/.tauri/edtib-console.key   # 生成在线更新签名密钥对
```

## 目录结构

```
console/
├── index.html                    # Vite 入口 HTML
├── package.json                  # 前端依赖与脚本（dev / build / preview / tauri）
├── package-lock.json
├── vite.config.ts                # Vite 配置（固定端口 1430，忽略 src-tauri）
├── tsconfig.json                 # 前端 TS 配置
├── tsconfig.node.json
├── dist/                         # 前端构建产物（tauri.conf.json 的 frontendDist 指向此处）
├── src/                          # 前端源码（Vue 3 + TS）
│   ├── main.ts
│   ├── App.vue
│   └── vite-env.d.ts
├── src-tauri/                    # Rust 侧（Tauri）
│   ├── Cargo.toml
│   ├── build.rs
│   ├── tauri.conf.json                 # 主配置
│   ├── tauri.macos.conf.json           # macOS 覆盖（app+dmg、ad-hoc 签名）
│   ├── tauri.windows.conf.json         # Windows 覆盖（nsis）
│   ├── capabilities/default.json       # 权限能力集
│   ├── icons/                          # 应用图标（已由老项目源图生成）
│   ├── migrations/0001_init.sql        # SQL 迁移（占位）
│   └── src/
│       ├── main.rs                     # 进程入口
│       ├── lib.rs                      # 插件注册 / 状态托管 / 命令挂载
│       ├── state.rs                    # AppState
│       ├── error.rs                    # AppError / AppResult
│       ├── commands/{mod,app,db,schedule}.rs   # 按业务域拆分的命令模块
│       ├── db/mod.rs                   # SQLite 连接 + 迁移执行器
│       └── schedule/mod.rs             # 定时任务调度骨架
├── .github/workflows/release.yml # 多平台打包 + 发 Release + 生成 latest.json
└── docs/
    ├── electron-to-tauri.md      # Electron→Tauri 架构/目录映射与关键决策
    └── tauri-development.md      # 开发、发版、更新密钥与自检手册
```

## 打包目标

| 平台 | 目标 | 说明 |
| --- | --- | --- |
| macOS | `app`、`dmg` | ad-hoc 签名（无 Apple 证书）；在线更新包为 `.app.tar.gz` + `.sig` |
| Windows | `nsis` | `.exe` 安装程序，perMachine，中英双语安装器 |

> Tauri v2 内置打包目标为 `deb` / `rpm` / `appimage` / `msi` / `nsis` / `app` / `dmg`，**不含 `zip`**。
> 平台差异通过平台专属配置文件承载（macOS 自动合并 `tauri.macos.conf.json`，Windows 自动合并
> `tauri.windows.conf.json`）。

## 在线更新

- endpoint：`https://github.com/trexwb/Edtib-Console/releases/latest/download/latest.json`
- 签名：Tauri minisign 密钥对，私钥仅存 GitHub Secrets
  （`TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`）
- 发版：打 `v*` tag 即触发 CI 构建三平台产物并发 Release

## 迁移状态

- [x] Tauri v2 + Vue3 + Vite + TS 骨架搭建
- [x] 目录布局与前台 books 对齐（前端上移仓库根目录、脚本/依赖口径一致、`frontendDist: ../dist`）
- [x] 平台覆盖配置、capabilities、图标、`cargo check` 验证
- [x] GitHub 自动打包 + 在线更新配置
- [ ] 业务模块迁移（渲染层、Rust 命令、SQLite 迁移、定时任务、与 gateway 的同步协议）—— 尚未开始

