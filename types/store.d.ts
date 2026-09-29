declare interface AclModuleType {
  admin: boolean
  permission: string[]
  role: string[]
  configuration: any,
  seo: any,
  languages: any,
  defaultItem: any,
  currentLang: string
}

declare interface ErrorLogModuleType {
  errorLogs: any[]
}

declare interface RoutesModuleType {
  tab: {
    data: string | undefined
  }
  tabMenu: string | undefined
  activeMenu: {
    data: string | undefined
  }
  routes: any[]
  allRoutes: any[]
}

declare type DeviceType = 'mobile' | 'desktop'
declare type LanguageType = 'zh' | 'en'

declare interface SettingsModuleType {
  collapse: boolean
  color: string
  device: DeviceType
  isCatchedTabs: boolean
  language: LanguageType
  lock: boolean
  logo: string
  mode: string
  theme: ThemeType
  title: string
}

declare interface TabsModuleType {
  catchedRoutes: []
  visitedRoutes: any[]
}

declare interface UserModuleType {
  avatar: string
  token: string | boolean
  username: string
}
