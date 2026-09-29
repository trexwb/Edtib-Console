import { visualizer } from 'rollup-plugin-visualizer'

export const createRollup = () => {
  return visualizer({
    filename: './dist/stats.html', // 设置输出路径和文件名
    open: false, // 是否自动打开浏览器查看报告
    gzipSize: true, // 显示gzip压缩后的大小
    brotliSize: true, // 显示brotli压缩后的大小
  })
}
