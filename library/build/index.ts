import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import chokidar from 'chokidar'
import dayjs from 'dayjs'
import pc from 'picocolors'
import type { Plugin } from 'vite'
import { createBanner } from './banner'
import { createMock } from './mock'
import { createProgress } from './progress'
import { createPwa } from './pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { createSvgIcons } from './svgSprite'
import { createUnPlugin } from './unplugin'
// import { createRollup } from './rollup/'
import { port } from '../../src/config'
// [框架统一] 与 books 共用同一份框架代码：日志前缀取 package.json name，禁止写死项目名
import { name as pkgName } from '../../package.json'
// import { createReplace } from './unplugin/replace'

const vitePrefix = 'VITE_'
const viteApp = vitePrefix + 'APP_'
const viteUser = vitePrefix + 'USER_'

export const createVitePlugin = (env: Record<string, string>) => {
  const vitePlugins: (Plugin | Plugin[])[] = [vue()]
  // 桌面端（Tauri）构建通过 beforeBuildCommand 注入 TAURI_BUILD=1：
  // 内联全部 chunk 为单文件并降级 module 脚本，规避 Tauri 资源协议下的 crossorigin / SW 白屏（对齐 lockPass）。
  const isTauri = !!process.env.TAURI_BUILD
  const userName = env[`${viteApp}GITHUB_USER_NAME`]
  const secretKey = env[`${viteApp}SECRET_KEY`]
  const nodeEnv = env[`${viteUser}NODE_ENV`]
  const assetUrl = env[`${vitePrefix}ASSETS_BASE_URL`]
  const isEmpty = (value: any) => {
    return value == undefined || value == '' || value == null
  }
  // 迁移说明：老项目在此处对缺失授权码（VITE_APP_GITHUB_USER_NAME / VITE_APP_SECRET_KEY）
  // 的工程直接 `return`（返回 undefined），导致连 vue 插件本身都不注册、构建直接崩溃。
  // Tauri 迁移后改为「插件链始终按完整模式注册」，仅在缺失授权码时打印提示；
  // 运行期的授权校验逻辑（library/plugins/vab.ts 的 isCheck）保持与老项目一致，未作改动。
  if (isEmpty(userName) || isEmpty(secretKey)) {
    console.warn(
      `\n${pc.yellow(`[${pkgName}]`)} 未检测到 ${viteApp}GITHUB_USER_NAME / ${viteApp}SECRET_KEY（由 .env 与 .env.local 提供），已按完整插件链注册，跳过授权码校验提示。\n`
    )
  }
  if (nodeEnv !== 'development') if (isEmpty(userName) || isEmpty(secretKey)) console.warn(`\n${pc.yellow(`[${pkgName}]`)} 生产环境缺少授权码，如为正式发布请补齐 .env.local。\n`)
  vitePlugins.push(vueJsx())
  vitePlugins.push(createProgress(env) as any)
  vitePlugins.push(createUnPlugin(env))
  if (isTauri) {
    // 桌面端：跳过 PWA（SW 在 Tauri webview 不被支持，且会被 remove-dist-sw 清理）；改用 singlefile 内联
    // 依赖里的 vite-plugin-singlefile 并无 demoteModuleScripts 选项（该选项属于另一分支），传入只会静默失效；
    // 真要降级 module 脚本需同时设置 rollup output.format='iife'，此处维持默认行为不变
    vitePlugins.push(viteSingleFile() as any)
  } else {
    vitePlugins.push(createPwa())
  }
  vitePlugins.push(createMock())
  vitePlugins.push(createSvgIcons())
  vitePlugins.push(createBanner())
  // vitePlugins.push(createRollup())
  // 将静态文件指向OSS域名，有利于利用OSS流量减负
  // vitePlugins.push(createReplace())
  // if (nodeEnv !== 'development') vitePlugins.push({
  //   name: 'html-transform',
  //   transformIndexHtml(html, ctx) {
  //     return html.replace(/\/console\/static\//g, (assetUrl || `https://oss.lixitu.com/console/${nodeEnv === 'production' ? 'master' : nodeEnv}`) + '/static/');
  //     // return html.replace(/\.\/static\//g, (assetUrl || `https://oss.lixitu.com/console/${nodeEnv === 'production' ? 'master' : nodeEnv}`) + '/static/')
  //     // .replace(/\/console\/static\//g, (assetUrl || `https://oss.lixitu.com/console/${nodeEnv === 'production' ? 'master' : nodeEnv}`) + '/static/');
  //   }
  // })
  return vitePlugins
}

export const createWatch = (env: Record<string, string>) => {
  //为了防止新同事忘记配置授权码而造成项目无法打包，请保留以下提示
  const userName = env[`${viteApp}GITHUB_USER_NAME`]
  const secretKey = env[`${viteApp}SECRET_KEY`]
  const nodeEnv = env[`${viteUser}NODE_ENV`]
  // console.log(nodeEnv, userName, secretKey)

  if (nodeEnv === 'development') {
    chokidar.watch('./src/views').on('change', (path) => {
      if (path.endsWith('vue')) {
        console.log(
          `\n${pc.gray(dayjs().format('HH:mm:ss'))} ${pc.cyan('[Vue Sh' + 'op Vite]')} ${pc.cyan(`http://localhost:${port}/`)} ${pc.green(
            'update success'
          )} `
        )
      }
    })
  }
}
