/** 读取本地持久化的当前维护语言（JSON 字符串），损坏/缺失时回退空串 */
const getStoredCurrentLang = (): string => {
  try {
    const raw = localStorage.getItem('currentLang')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed === 'string') return parsed
    }
  } catch {
    // 数据损坏时忽略，走默认语言
  }
  return ''
}

export const useAclStore = defineStore('acl', {
  state: (): AclModuleType => ({
    admin: false,
    role: [] as string[],
    permission: [] as string[],
    configuration: {} as any,
    seo: {} as any,
    languages: {} as any,
    defaultItem: {} as any, // 现在类型校验通过
    currentLang: getStoredCurrentLang(), // 全局当前维护语言（数据语言），持久化 localStorage
  }),
  getters: {
    getAdmin: (state) => state.admin,
    getRole: (state) => state.role,
    getPermission: (state) => state.permission,
    getEnum: (state) => state.configuration,
    getSeo: (state) => state.seo,
    getLanguages: (state) => state.languages,
    getDefaultItem: (state) => state.defaultItem,
    getCurrentLang: (state) => state.currentLang || state.defaultItem?.languages || 'zh-cn',
  },
  actions: {
    setFull(admin: boolean) {
      this.admin = admin
    },
    setRole(role: string[]) {
      this.role = role
    },
    setPermission(permission: string[]) {
      this.permission = permission
    },
    setEnum(configuration: any) {
      this.configuration = configuration
    },
    setSeo(seo: any) {
      this.seo = seo
    },
    setLanguages(languages: any) {
      this.languages = languages
    },
    setDefaultItem(defaultItem: any) {
      this.defaultItem = defaultItem
    },
    setCurrentLang(code: string) {
      if (!code) return
      this.currentLang = code
      try {
        localStorage.setItem('currentLang', JSON.stringify(code))
      } catch {
        // 持久化失败仅影响刷新后的记忆，不影响当前会话
      }
    },
  },
})
