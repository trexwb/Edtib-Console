/**
 * 多语言字段显示解析（列表页/预览态通用）
 * @description 后端多语言字段（titles/names 等）以 JSON 对象存储（如 {"zh-cn":"..."}），
 * Vue3 模板插值对 object 会 JSON.stringify 导致页面输出 JSON 原文；
 * 本工具统一解析：当前语言 → 默认语言 → 任意非空值；兼容历史 JSON 字符串形态与纯文本
 */
export const multilangText = (value: unknown, currentLang?: string, defaultLang = 'zh-cn'): string => {
  if (value === null || value === undefined || value === '') return ''
  let obj: unknown = value
  if (typeof obj === 'string') {
    const text = (obj as string).trim()
    if (!text.startsWith('{') && !text.startsWith('[')) return text
    try {
      obj = JSON.parse(text)
    } catch {
      return text
    }
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== null && item !== undefined && String(item).trim() !== '')
      .map((item) => String(item).trim())
      .join('|')
  }
  if (obj && typeof obj === 'object') {
    const record = obj as Record<string, unknown>
    const pick = (key: string): string => {
      const v = record[key]
      return v === null || v === undefined ? '' : String(v).trim()
    }
    const lang = (currentLang || '').toLowerCase()
    if (lang && pick(lang)) return pick(lang)
    if (pick(defaultLang)) return pick(defaultLang)
    for (const v of Object.values(record)) {
      if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim()
    }
    return ''
  }
  return String(obj)
}
