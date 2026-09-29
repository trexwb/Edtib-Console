<template>
  <el-dropdown trigger="click" @command="handleCommand">
    <span class="vab-language">
      <vab-icon icon="translate-2" />
      <span class="vab-language__name">{{ currentLangName }}</span>
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item v-for="lang in langOptions" :key="lang.code" :command="lang.code"
          :class="{ 'vab-language__item--active': lang.code === currentLangCode }">
          <span>{{ lang.name }}</span>
          <el-tag v-if="lang.code === defaultLangCode" size="small" type="success">默认</el-tag>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script lang="ts" setup>
import { useAclStore } from '/@/store/modules/acl'
import { useSettingsStore } from '/@/store/modules/settings'
import getPageTitle from '/@/utils/pageTitle'

const { locale } = useI18n()
const route = useRoute()
const settingsStore = useSettingsStore()
const { changeLanguage } = settingsStore
const aclStore = useAclStore()

/** 接口返回的语言字典（Record<code,{code,name}> 或数组），未加载时为空列表 */
const langList = computed<any[]>(() => {
  const dict = aclStore.languages
  if (Array.isArray(dict)) return dict.filter((item: any) => item && item.code)
  if (dict && typeof dict === 'object') return Object.values(dict).filter((item: any) => item && item.code)
  return []
})

/** 默认语言编码（接口 defaultItem.languages） */
const defaultLangCode = computed(() => aclStore.defaultItem?.languages || 'zh-cn')

/** 当前维护语言编码：接口已加载时用全局 currentLang；未加载（如登录页）回退 zh */
const currentLangCode = computed(() => {
  const cur = aclStore.getCurrentLang
  return cur || (langList.value.length ? defaultLangCode.value : 'zh')
})

/** 下拉选项：接口语言列表加载前（登录页等）回退为 zh/en 仅切 UI 文案 */
const langOptions = computed<any[]>(() => {
  if (langList.value.length) return langList.value
  return [
    { code: 'zh', name: '中文简体' },
    { code: 'en', name: 'English' },
  ]
})

const currentLangName = computed(() => {
  const target = langOptions.value.find((item: any) => item.code === currentLangCode.value)
  return target ? target.name : (currentLangCode.value === 'en' ? 'English' : '中文简体')
})

const handleCommand = (code: string) => {
  // 数据语言切换：写入全局并持久化；编辑/展示按当前语言走，提交仍为全部语言数据
  aclStore.setCurrentLang(code)
  document.title = getPageTitle(route.meta.title)
  // 顶部切换器同时驱动后台 UI 文案语言：en 切英文，zh-cn/zh/其它中文码切简体
  if (code === 'en') {
    changeLanguage('en')
    locale.value = 'en'
  } else {
    changeLanguage('zh')
    locale.value = 'zh'
  }
}
</script>

<style lang="scss" scoped>
.vab-language {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 100%;
  padding: 0 var(--el-padding);
  color: var(--el-text-color-primary);
  cursor: pointer;
  outline: none;

  &:hover {
    color: var(--el-color-primary);
  }

  .vab-language__name {
    max-width: 9em;
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :deep(.vab-icon) {
    font-size: 16px;
  }
}

:deep(.vab-language__item--active) {
  font-weight: 600;
}
</style>
