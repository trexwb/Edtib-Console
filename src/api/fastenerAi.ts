/**
 * Fastener AI 运维 API（Console 端）
 * 对接 gateway `/api/console/fastener/:fn`（FastenerMaintenanceController →
 * FastenerAdminService / FastenerMaintenanceService / FastenerToolService）
 * 权限：读 fastenerAi:read，写 fastenerAi:write
 * @Author: trexwb
 * @Date: 2026-09-10
 */
import request from '/@/utils/request'

/** 剔除空值参数，避免空字符串被后端当作有效筛选值 */
const clean = (payload: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  )

/* AI 会话列表（跨客户） */
export function fastenerAiSessionsList(data: {
  customerId?: number | string
  status?: number | string
  keyword?: string
  page?: number
  pageSize?: number
}) {
  return request({ url: '/console/fastener/fastenerAiSessionsList', method: 'post', data: clean(data) })
}

/* AI 会话详情（会话字段 + 全量消息，最多 500 条） */
export function fastenerAiSessionDetail(data: { id: number | string }) {
  return request({ url: '/console/fastener/fastenerAiSessionDetail', method: 'post', data: clean(data) })
}

/* AI 会话状态切换【批量】（status：0 禁用 / 1 启用） */
export function fastenerAiSessionDisable(data: { ids?: Array<number | string>; id?: number | string; status: number }) {
  return request({ url: '/console/fastener/fastenerAiSessionDisable', method: 'post', data: clean(data) })
}

/* 工具调用审计列表 */
export function fastenerAiToolCallsList(data: {
  customerId?: number | string
  sessionId?: number | string
  tool?: string
  confirmed?: number | string
  status?: number | string
  startAt?: string
  endAt?: string
  page?: number
  pageSize?: number
}) {
  return request({ url: '/console/fastener/fastenerAiToolCallsList', method: 'post', data: clean(data) })
}

/* 工具调用详情（params / result 全量） */
export function fastenerAiToolCallDetail(data: { id: number | string }) {
  return request({ url: '/console/fastener/fastenerAiToolCallDetail', method: 'post', data: clean(data) })
}

/* 用量与行为统计（days 默认 30，1~365） */
export function fastenerAiUsageStats(data: { days?: number; customerId?: number | string; startAt?: string; endAt?: string }) {
  return request({ url: '/console/fastener/fastenerAiUsageStats', method: 'post', data: clean(data) })
}

/* BM25 索引块列表 */
export function fastenerAiBlocksList(data: {
  sourceType?: number | string
  sourceId?: number | string
  accessLevel?: number | string
  status?: number | string
  keyword?: string
  page?: number
  pageSize?: number
}) {
  return request({ url: '/console/fastener/fastenerAiBlocksList', method: 'post', data: clean(data) })
}

/* BM25 索引概览（总数 + 按源类型/访问级别分组） */
export function fastenerAiStats() {
  return request({ url: '/console/fastener/fastenerAiStats', method: 'post', data: {} })
}

/* BM25 索引全量重建 */
export function fastenerAiRebuildBm25() {
  return request({ url: '/console/fastener/fastenerAiRebuildBm25', method: 'post', data: {} })
}

/* 工具白名单清单 */
export function fastenerAiToolManifest() {
  return request({ url: '/console/fastener/fastenerAiToolManifest', method: 'post', data: {} })
}
