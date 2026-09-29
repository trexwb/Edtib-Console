/**
 * Fastener 商业管理 API（Console 端）
 * 对接 gateway `/api/console/fastener/:fn`（FastenerMaintenanceController →
 * FastenerAdminService / FastenerStandardUpdatesService）
 * 权限：读 fastenerCommerce:read，写 fastenerCommerce:write
 * @Author: trexwb
 * @Date: 2026-09-11
 */
import request from '/@/utils/request'

/** 剔除空值参数，避免空字符串被后端当作有效筛选值 */
const clean = (payload: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  )

/* 积分流水列表（客户/来源/时间 筛选，分页） */
export function fastenerCommerceCreditsTransactions(data: {
  customerId?: number | string
  source?: string
  startAt?: string
  endAt?: string
  page?: number
  pageSize?: number
}) {
  return request({ url: '/console/fastener/fastenerCommerceCreditsTransactions', method: 'post', data: clean(data) })
}

/* 人工积分调整（delta 正数加/负数减，走钱包唯一入口，流水 source=admin）【写】 */
export function fastenerCommerceCreditsAdjust(data: { customerId: number | string; delta: number; remark?: string }) {
  return request({ url: '/console/fastener/fastenerCommerceCreditsAdjust', method: 'post', data: clean(data) })
}

/* 订单列表（场景/状态/渠道/客户/时间 筛选，分页） */
export function fastenerCommerceOrders(data: {
  customerId?: number | string
  scene?: number | string
  status?: number | string
  channel?: number | string
  startAt?: string
  endAt?: string
  page?: number
  pageSize?: number
}) {
  return request({ url: '/console/fastener/fastenerCommerceOrders', method: 'post', data: clean(data) })
}

/* 管理端关闭订单（仅待支付可关）【写】 */
export function fastenerCommerceOrderClose(data: { orderNo: string }) {
  return request({ url: '/console/fastener/fastenerCommerceOrderClose', method: 'post', data: clean(data) })
}

/* 管理端退款标记（仅已支付可标记；不自动回收权益，按需用积分调整冲正）【写】 */
export function fastenerCommerceOrderRefund(data: { orderNo: string }) {
  return request({ url: '/console/fastener/fastenerCommerceOrderRefund', method: 'post', data: clean(data) })
}

/* 标准购买记录列表（客户/体系/主体/时间 筛选，分页；含产品编码与当前版本） */
export function fastenerCommercePurchases(data: {
  customerId?: number | string
  sourceType?: number | string
  sourceId?: number | string
  startAt?: string
  endAt?: string
  page?: number
  pageSize?: number
}) {
  return request({ url: '/console/fastener/fastenerCommercePurchases', method: 'post', data: clean(data) })
}

/* ===== 订阅计划 / 订阅记录（权限 fastenerCommerce:read|write） ===== */

/* 订阅计划列表（状态/名称关键词 筛选，分页；含生效中订阅数） */
export function fastenerCommerceSubscriptionPlans(data: {
  status?: number | string
  keyword?: string
  page?: number
  pageSize?: number
}) {
  return request({ url: '/console/fastener/fastenerCommerceSubscriptionPlans', method: 'post', data: clean(data) })
}

/* 订阅计划创建/编辑（names 多语言、price 分、durationDays 天、giftCredits 赠送积分）【写】 */
export function fastenerCommerceSubscriptionPlanSave(data: Record<string, any>) {
  return request({ url: '/console/fastener/fastenerCommerceSubscriptionPlanSave', method: 'post', data: clean(data) })
}

/* 订阅计划启用/停用（1 启用 / 0 停用）【写】 */
export function fastenerCommerceSubscriptionPlanToggle(id: number | string, status: number) {
  return request({
    url: `/console/fastener/${status === 1 ? 'fastenerCommerceSubscriptionPlanEnable' : 'fastenerCommerceSubscriptionPlanDisable'}`,
    method: 'post',
    data: { id },
  })
}

/* 订阅计划软删除（存在生效中订阅记录时后端拒绝）【写】 */
export function fastenerCommerceSubscriptionPlanDelete(data: { id: number | string }) {
  return request({ url: '/console/fastener/fastenerCommerceSubscriptionPlanDelete', method: 'post', data: clean(data) })
}

/* 订阅记录列表（客户/计划/来源/状态/创建时间 筛选，分页） */
export function fastenerCommerceSubscriptions(data: {
  customerId?: number | string
  planId?: number | string
  source?: number | string
  status?: number | string
  startAt?: string
  endAt?: string
  page?: number
  pageSize?: number
}) {
  return request({ url: '/console/fastener/fastenerCommerceSubscriptions', method: 'post', data: clean(data) })
}

/* 订阅记录详情（记录 + 计划 + 客户基础信息 + 关联订阅订单） */
export function fastenerCommerceSubscriptionDetail(data: { id: number | string }) {
  return request({ url: '/console/fastener/fastenerCommerceSubscriptionDetail', method: 'post', data: clean(data) })
}

/* 后台赠送/延长订阅（source=3；days 不传取计划时长；按计划同步发放赠送积分）【写】 */
export function fastenerCommerceSubscriptionGrant(data: {
  customerId: number | string
  planId?: number | string
  days?: number
  remark?: string
}) {
  return request({ url: '/console/fastener/fastenerCommerceSubscriptionGrant', method: 'post', data: clean(data) })
}

/* 后台取消订阅（status → 3，仅待生效/生效中可取消；不回收已发放权益）【写】 */
export function fastenerCommerceSubscriptionCancel(data: { id: number | string }) {
  return request({ url: '/console/fastener/fastenerCommerceSubscriptionCancel', method: 'post', data: clean(data) })
}
