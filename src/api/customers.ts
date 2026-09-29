/**
 * 客户管理 API（离线优先）
 * @Author: trexwb
 * @Date: 2026-04-16
 */
import request from '/@/utils/request'
import requestBridge from '/@/utils/requestBridge'

/* 获取个人开户列表 */
export async function usersList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  const col = data.sort ? data.sort.replace(/^[+-]/, '') : ''
  const order = col ? [{ column: col, order: data.sort!.startsWith('-') ? 'DESC' : 'ASC' }] : undefined
  const limit = data.pageSize || 20
  const offset = ((data.page || 1) - 1) * limit

  const result = await requestBridge.getList({
    ipc: { table: 'customers', filters: data.filter || {}, order, limit, offset },
    http: { url: '/console/customers/usersList', data },
  })
  return { data: result }
}

/* 获取个人开户详情 */
export async function usersDetail(data: { id?: number | number[] }) {
  const id = Array.isArray(data.id) ? data.id[0] : data.id
  const result = await requestBridge.getOne({
    ipc: { table: 'customers', id },
    http: { url: '/console/customers/usersDetail', data },
  })
  return { data: result }
}

/* 保存个人开户信息 */
export function usersSave(data: {
  id?: number
  nickname?: string
  truename?: string
  email?: string
  mobile?: string
  avatar?: string
  password?: string
  times_expire?: string
  credit?: number
  extension?: object
  status?: number
}) {
  return request({ url: '/console/customers/usersSave', method: 'post', data })
}

/* 获取个人开户审核列表 */
export function usersReviewList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  return request({ url: '/console/customers/usersReviewList', method: 'post', data })
}

/* 获取个人开户审核详情 */
export function usersReviewDetail(data: { id?: number | number[] }) {
  return request({ url: '/console/customers/usersReviewDetail', method: 'post', data })
}

/* 保存个人开户审核 */
export function usersReviewSave(data: {
  id?: number
  nickname?: string
  truename?: string
  email?: string
  mobile?: string
  avatar?: string
  password?: string
  times_expire?: string
  credit?: number
  manager_uuid?: string
  extension?: object
  status?: number
  remark?: string
}) {
  return request({ url: '/console/customers/usersReviewSave', method: 'post', data })
}

/* 获取序列号列表 */
export async function serialsList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  const col = data.sort ? data.sort.replace(/^[+-]/, '') : ''
  const order = col ? [{ column: col, order: data.sort!.startsWith('-') ? 'DESC' : 'ASC' }] : undefined
  const limit = data.pageSize || 20
  const offset = ((data.page || 1) - 1) * limit

  const result = await requestBridge.getList({
    ipc: { table: 'serials', filters: data.filter || {}, order, limit, offset },
    http: { url: '/console/customers/serialsList', data },
  })
  return { data: result }
}

/* 序列号状态修改【批量】 */
export function serialsStatus(data: { id?: number | number[]; remark?: string; status?: number }) {
  return request({ url: '/console/customers/serialsStatus', method: 'post', data })
}

/* 批量生产序列号 */
export function serialsSave(data: {
  remark: string
  type?: number
  need_secret?: number
  level?: number
  days?: number
  credit?: number
  price?: number
  times_expire?: string
  extension?: object
  quantity?: number
}) {
  return request({ url: '/console/customers/serialsSave', method: 'post', data })
}

/* 获取个人交易记录列表（后端返回 { data, meta }，此处统一归一化为 { list, total }） */
export async function usersTransactionsList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  const res: any = await request({ url: '/console/customers/usersTransactionsList', method: 'post', data })
  const result = res?.data || {}
  return { data: { list: result.data || [], total: result.meta?.total || 0 } }
}

/* 获取个人交易记录详情 */
export async function usersTransactionsDetail(data: { id?: number }) {
  const res: any = await request({ url: '/console/customers/usersTransactionsDetail', method: 'post', data })
  return { data: res?.data || null }
}

/* 获取企业交易记录列表（后端返回 { data, meta }，此处统一归一化为 { list, total }） */
export async function organizationsTransactionsList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  const res: any = await request({ url: '/console/customers/organizationsTransactionsList', method: 'post', data })
  const result = res?.data || {}
  return { data: { list: result.data || result.list || [], total: result.meta?.total ?? result.total ?? 0 } }
}

/* 获取企业交易记录详情 */
export async function organizationsTransactionsDetail(data: { id?: number }) {
  const res: any = await request({ url: '/console/customers/organizationsTransactionsDetail', method: 'post', data })
  return { data: res?.data || null }
}

export { requestBridge }
