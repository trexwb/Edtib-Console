/**
 * @description 导出cli配置，以下所有配置修改需要重启项目
 */
export const cliConfig: { [key: string]: string | number | boolean } = {
  // hash模式时在不确定二级目录名称的情况下建议使用""或"./"来代表相对路径
  // history模式默认使用"/"或"/二级目录/"，只有hash时base可以为空，如果您配置了history模式那么此项不可为空！
  base: process.env['NODE_ENV'] == 'development' ? '/console/' : '/',
  // 生产环境构建文件的目录名
  outDir: 'dist',
  // 放置生成的静态资源 (js、css、img、fonts) 的目录。
  assetsDir: 'static',
  // 开发环境端口号
  port: 9002,
  // pwa
  pwa: false,
  // build时规定触发警告的 chunk 大小。（以 kbs 为单位）
  chunkSizeWarningLimit: 20480,
  // 开发服务器启动时，自动在浏览器中打开应用程序
  open: false,
  // build时启用/禁用 CSS 代码拆分
  cssCodeSplit: true,
  // 启用/禁用 gzip 压缩大小报告
  reportCompressedSize: true,
  // 混淆器 boolean | 'terser' | 'esbuild'
  minify: 'esbuild',
  // 打包后的文件是否开启hash
  outputHash: true,
  // 开发环境是否启用mock
  localEnabled: false,
  // 生产环境是否启用mock
  prodEnabled: false,
}
