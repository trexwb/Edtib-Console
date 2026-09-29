/* vite-plugin-svg-icons 虚拟模块声明（原引用 vite-plugin-svg-icons/client，该包未在 exports 暴露 ./client 子路径，bundler 解析失败） */
declare module 'virtual:svg-icons-register' {
  const component: any
  export default component
}

declare module 'virtual:svg-icons-names' {
  const iconsNames: string[]
  export default iconsNames
}
