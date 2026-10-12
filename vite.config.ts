import { basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import autoprefixer from 'autoprefixer'
import dayjs from 'dayjs'
import type { ConfigEnv, UserConfig } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import { createVitePlugin, createWatch } from './library/build'
import { dependencies, devDependencies, name, version } from './package.json'
import {
  allowedHosts,
  assetsDir,
  base,
  chunkSizeWarningLimit,
  cssCodeSplit,
  minify,
  open,
  outDir,
  outputHash,
  port,
  reportCompressedSize,
} from './src/config'

// ============================================================================
// [迁移调整] 该配置由老 Electron 项目 client/books/web/vite.config.ts 迁移而来：
//   1. base 固定 './'：Tauri 打包后前端由 tauri://localhost 自定义协议加载，无服务器基准路径；
//   2. 构建产物输出到项目根 dist/（tauri.conf.json -> build.frontendDist = ../dist），
//      不再输出到 Electron 的 electron/output/view；
//   3. [框架统一] dev server 的 port / allowedHosts 一律取自 src/config/cli.config.ts
//      （与 books 同一份框架代码，变量点集中在 cli.config，不允许在本文件再写死）；
//   4. build.target 按 macOS WKWebView 能力设定（es2021 + safari15）；
//   5. 旧项目基于 rolldown-vite(vite8) 的 codeSplitting.groups 在 rollup 内核的 vite7 上不生效，
//      改为等价的手工分包函数（声明顺序即匹配优先级，与旧语义一致）；
//   6. 移除 rolldown 专属的 optimizeDeps.rolldownOptions。
// ============================================================================
const rootDir = fileURLToPath(new URL('.', import.meta.url))
const host = process.env.TAURI_DEV_HOST
const lastBuildTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
const info = { dependencies, devDependencies, lastBuildTime, name, version }

const manualChunkGroups: [string, RegExp][] = [
  ['element-plus', /element-plus|@element-plus[\\/]icons-vue/],
  ['xe-utils', /xe-utils/],
  ['vxe-table', /vxe-table/],
  ['echarts', /echarts|vue-echarts/],
  ['three', /three|three-stl-loader/],
  ['vendor-core', /vue[\\/]|vue-router|pinia/],
  ['vendor-utils', /axios|dayjs|lodash-es|crypto-js/],
]

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  process.env['VITE_APP_UPDATE_TIME'] = info.lastBuildTime
  const root = process.cwd()
  const env = loadEnv(mode, root)
  createWatch(env)
  // 仅将业务实际消费的变量注入前端（NODE_ENV + VITE_* 前缀），
  // 避免把整个 process.env（含 PATH、npm_*、密钥等服务器端变量）暴露到客户端 bundle
  const clientEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => key === 'NODE_ENV' || key.startsWith('VITE_')))

  return {
    base,
    root,
    server: {
      open,
      port,
      // [迁移调整] Tauri 使用固定端口，端口被占用时直接失败而不是静默切换
      strictPort: true,
      cors: true,
      hmr: host
        ? {
            protocol: 'ws',
            host,
            port,
            overlay: true,
          }
        : {
            overlay: true,
          },
      host: host || '0.0.0.0',
      proxy: {
        '/api': {
          // [口径调整] npm run dev（.env.development）= 本地 API 服务口径：经 docker nginx 转发到开发网关
          target: 'https://gateway-dev.edtib.com',
          changeOrigin: true,
          secure: false,
        },
      },
      allowedHosts,
      watch: {
        // [迁移调整] 忽略监听 src-tauri，避免 Rust 侧编译产物触发前端热更新
        ignored: ['**/src-tauri/**'],
      },
    },
    resolve: {
      alias: {
        '~/': `${rootDir}/`,
        '/@/': `${rootDir}/src/`,
        '/@vab/': `${rootDir}/library/`,
        '/@types/': `${rootDir}/src/types/`,
      },
    },
    build: {
      // [迁移调整] macOS WKWebView 执行能力基线（Tauri v2 桌面端：macOS 10.15+ / Safari 15 内核以上）
      target: ['es2021', 'safari15'],
      assetsDir,
      chunkSizeWarningLimit,
      cssCodeSplit,
      outDir: resolve(rootDir, outDir),
      emptyOutDir: true,
      reportCompressedSize,
      rollupOptions: {
        onwarn: () => {
          return
        },
        output: {
          chunkFileNames: outputHash ? 'static/js/[name]-[hash].js' : 'static/js/[name].js',
          entryFileNames: outputHash ? 'static/js/[name]-[hash].js' : 'static/js/[name].js',
          assetFileNames: outputHash ? 'static/[ext]/[name]-[hash].[ext]' : 'static/[ext]/[name].[ext]',
          // 桌面端（TAURI_BUILD）走 singlefile 内联，codeSplitting=false 与 manualChunks 互斥，故关闭
          manualChunks: process.env.TAURI_BUILD ? undefined : function (id: string) {
            if (!id.includes('node_modules')) return
            for (const [chunkName, test] of manualChunkGroups) {
              if (test.test(id)) return chunkName
            }
            return 'vendor'
          },
        },
      },
      minify,
      terserOptions: {
        compress: {
          drop_console: true, // 移除 console.log 以减小生产环境构建包大小
          drop_debugger: true,
        },
      },
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer({ grid: true }) as any,
          {
            postcssPlugin: 'internal:charset-removal',
            AtRule: {
              charset: (atRule: { name: string; remove: () => void }) => {
                if (atRule.name === 'charset') atRule.remove()
              },
            },
          },
        ],
      },
      preprocessorOptions: {
        scss: {
          // [迁移调整] ESM 配置下 require 不可用，改为顶部静态导入 basename
          additionalData(content: string, loaderContext: string) {
            return ['variables.scss'].includes(basename(loaderContext)) ? content : `@use "~/library/styles/variables.scss" as *;${content}`
          },
        },
      },
      devSourcemap: true,
    },
    plugins: createVitePlugin(env),
    assetsInclude: ['**/*.stl'],
    define: {
      'process.env': clientEnv,
    },
  }
})

