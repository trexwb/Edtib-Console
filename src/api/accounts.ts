/**
 * 账号管理 API（离线优先）
 * @Author: trexwb
 * @Date: 2026-04-16
 */
import request from '/@/utils/request'
import CryptoJS from 'crypto-js'
import requestBridge from '/@/utils/requestBridge'

// ============ 角色管理 ============

/* 角色还原【批量】 */
export function rolesRestore(data: { id?: number | number[] }) {
  return request({ url: '/console/accounts/rolesRestore', method: 'post', data })
}

/* 角色删除【批量】 */
export function rolesDelete(data: { id?: number | number[] }) {
  return request({ url: '/console/accounts/rolesDelete', method: 'post', data })
}

/* 角色详细 */
export async function rolesDetail(data: { id?: number | number[] }) {
  const id = Array.isArray(data.id) ? data.id[0] : data.id
  const result = await requestBridge.getOne({
    ipc: { table: 'roles', id },
    http: { url: '/console/accounts/rolesDetail', data },
  })
  return { data: result }
}

/* 角色禁用【批量】 */
export function rolesDisable(data: { id?: number | number[] }) {
  return request({ url: '/console/accounts/rolesDisable', method: 'post', data })
}

/* 角色启用【批量】 */
export function rolesEnable(data: { id?: number | number[] }) {
  return request({ url: '/console/accounts/rolesEnable', method: 'post', data })
}

/* 角色保存 */
export function rolesSave(data: {
  id?: number
  name?: string
  permissions?: object
  operation?: object
  extension?: object
  status?: string
}) {
  return request({ url: '/console/accounts/rolesSave', method: 'post', data })
}

/* 角色列表 */
export async function rolesList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  const col = data.sort ? data.sort.replace(/^[+-]/, '') : ''
  const order = col
    ? [{ column: col, order: data.sort!.startsWith('-') ? 'DESC' : 'ASC' }]
    : undefined
  const limit = data.pageSize || 20
  const offset = ((data.page || 1) - 1) * limit

  const result = await requestBridge.getList({
    ipc: { table: 'roles', filters: data.filter || {}, order, limit, offset },
    http: { url: '/console/accounts/rolesList', data },
  })
  return { data: result }
}

// ============ 用户管理 ============

/* 账号还原【批量】 */
export function usersRestore(data: { id?: number | number[] }) {
  return request({ url: '/console/accounts/usersRestore', method: 'post', data })
}

/* 账号删除【批量】 */
export function usersDelete(data: { id?: number | number[] }) {
  return request({ url: '/console/accounts/usersDelete', method: 'post', data })
}

/* 账号详细 */
export async function usersDetail(data: { id?: number | number[] }) {
  const id = Array.isArray(data.id) ? data.id[0] : data.id
  const result = await requestBridge.getOne({
    ipc: { table: 'users', id },
    http: { url: '/console/accounts/usersDetail', data },
  })
  return { data: result }
}

/* 账号禁用【批量】 */
export function usersDisable(data: { id?: number | number[] }) {
  return request({ url: '/console/accounts/usersDisable', method: 'post', data })
}

/* 账号启用【批量】 */
export function usersEnable(data: { id?: number | number[] }) {
  return request({ url: '/console/accounts/usersEnable', method: 'post', data })
}

/* 账号列表 */
export async function usersList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  const col = data.sort ? data.sort.replace(/^[+-]/, '') : ''
  const order = col
    ? [{ column: col, order: data.sort!.startsWith('-') ? 'DESC' : 'ASC' }]
    : undefined
  const limit = data.pageSize || 20
  const offset = ((data.page || 1) - 1) * limit

  const result = await requestBridge.getList({
    ipc: { table: 'users', filters: data.filter || {}, order, limit, offset },
    http: { url: '/console/accounts/usersList', data },
  })
  return { data: result }
}

/* 账号保存 */
export function usersSave(data: {
  id?: number
  nickname?: string
  truename?: string
  email?: string
  mobile?: string
  avatar?: string
  password?: string
  extension?: object
  roles?: object
  status?: string
}) {
  if (data.password) data.password = CryptoJS.MD5(data.password || '').toString()
  return request({ url: '/console/accounts/usersSave', method: 'post', data })
}

export { requestBridge }
