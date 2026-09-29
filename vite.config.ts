import autoprefixer from 'autoprefixer'
import dayjs from 'dayjs'
import { resolve } from 'path'
import type { ConfigEnv, UserConfig } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import { createVitePlugin, createWatch } from './library/build'
import { dependencies, devDependencies, name, version } from './package.json'
import { assetsDir, chunkSizeWarningLimit, cssCodeSplit, minify, open, outputHash, reportCompressedSize } from './src/config'

const lastBuildTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
const info = { dependencies, devDependencies, lastBuildTime, name, version }

// Tauri 使用固定端口：端口被占用时直接失败，而不是静默切换。
// 端口与 books（1420 / HMR 1421）错开，避免两个 Tauri 项目同时开发时冲突。
const DEV_PORT = 1430
const HMR_PORT = 1431
const host = process.env.TAURI_DEV_HOST

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  process.env['VITE_APP_UPDATE_TIME'] = info.lastBuildTime
  const root = process.cwd()
  const env = loadEnv(mode, root)
  createWatch(env)
  // 仅将业务实际消费的变量注入前端（NODE_ENV + VITE_* 前缀），
  // 避免把整个 process.env（含 PATH、npm_*、密钥等服务器端变量）暴露到客户端 bundle
  const clientEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key === 'NODE_ENV' || key.startsWith('VITE_')),
  )

  return {
    // 老项目 web 由 Electron 内置 HTTPS 站点以 /console/ 二级目录托管；
    // Tauri 由内嵌协议从根路径托管 frontendDist，故 base 固定为 '/'
    base: '/',
    root,
    server: {
      open,
      // 固定 1430，与 tauri.conf.json 的 devUrl 保持一致
      port: DEV_PORT,
      strictPort: true,
      host: host || false,
      cors: true,
      hmr: host
        ? {
            protocol: 'ws',
            host,
            port: HMR_PORT,
          }
        : {
            overlay: true,
          },
      watch: {
        // 忽略监听 src-tauri，避免 Rust 侧编译产物触发前端热更新
        ignored: ['**/src-tauri/**'],
      },
    },
    resolve: {
      alias: {
        '~/': `${resolve(__dirname, '.')}/`,
        '/@/': `/${resolve(__dirname, 'src')}/`,
        '/@vab/': `/${resolve(__dirname, 'library')}/`,
        '/@types/': `/${resolve(__dirname, 'src/types')}/`,
      },
    },
    build: {
      assetsDir,
      chunkSizeWarningLimit,
      cssCodeSplit,
      // Tauri 前端产物目录（tauri.conf.json build.frontendDist = ../dist）
      outDir: resolve(__dirname, 'dist'),
      reportCompressedSize,
      rollupOptions: {
        onwarn: () => {
          return
        },
        output: {
          chunkFileNames: outputHash ? 'static/js/[name]-[hash].js' : 'static/js/[name].js',
          entryFileNames: outputHash ? 'static/js/[name]-[hash].js' : 'static/js/[name].js',
          assetFileNames: outputHash ? 'static/[ext]/[name]-[hash].[ext]' : 'static/[ext]/[name].[ext]',
          // 分包策略：将大型库单独打包，减少首屏 bundle 体积
          manualChunks: (id) => {
            // Element Plus 相关
            if (id.includes('element-plus') || id.includes('@element-plus/icons-vue')) {
              return 'element-plus'
            }
            // xe-utils（vxe-table 依赖库，必须在前）
            if (id.includes('xe-utils')) {
              return 'xe-utils'
            }
            // VxeTable 表格组件
            if (id.includes('vxe-table')) {
              return 'vxe-table'
            }
            // ECharts 图表库
            if (id.includes('echarts') || id.includes('vue-echarts')) {
              return 'echarts'
            }
            // Vue 相关（核心）
            if (id.includes('vue/') || id.includes('vue-router') || id.includes('pinia')) {
              return 'vendor-core'
            }
            // 常用工具库
            if (id.includes('axios') || id.includes('dayjs') || id.includes('lodash-es') || id.includes('crypto-js')) {
              return 'vendor-utils'
            }
            // 其他 node_modules
            if (id.includes('node_modules')) {
              return 'vendor'
            }
          },
        },
      },
      minify,
    },
    // minify 为 esbuild 时 terserOptions 不生效，console/debugger 须在此配置 drop；
    // 仅生产构建移除，开发环境保留调试能力
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
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
          additionalData(content: string, loaderContext: string) {
            const { basename } = require('path')
            return ['variables.scss'].includes(basename(loaderContext)) ? content : `@use "~/library/styles/variables.scss" as *;${content}`
          },
        },
      },
      devSourcemap: true,
    },
    plugins: createVitePlugin(env),
    define: {
      'process.env': clientEnv,
    },
    optimizeDeps: {
      rolldownOptions: {
        transform: {
          // Node.js global to enable tree shaking of the `process` global in node modules that depend on it.
          define: {
            global: 'undefined',
          },
        },
      },
    },
  }
})
