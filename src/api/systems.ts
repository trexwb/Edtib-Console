/**
 * 系统管理 API（离线优先）
 * @Author: trexwb
 * @Date: 2026-04-16
 */
import request from '/@/utils/request'
import requestBridge from '/@/utils/requestBridge'

// ============ API密钥 ============
export function secretsRestore(data: { id?: number | number[] }) {
  return request({ url: '/console/systems/secretsRestore', method: 'post', data })
}
export function secretsDelete(data: { id?: number | number[] }) {
  return request({ url: '/console/systems/secretsDelete', method: 'post', data })
}
export async function secretsDetail(data: { id?: number | number[] }) {
  const id = Array.isArray(data.id) ? data.id[0] : data.id
  const result = await requestBridge.getOne({
    ipc: { table: 'secrets', id },
    http: { url: '/console/systems/secretsDetail', data },
  })
  return { data: result }
}
export function secretsDisable(data: { id?: number | number[] }) {
  return request({ url: '/console/systems/secretsDisable', method: 'post', data })
}
export function secretsEnable(data: { id?: number | number[] }) {
  return request({ url: '/console/systems/secretsEnable', method: 'post', data })
}
export function secretsSave(data: {
  id?: number; title?: string; app_id?: string; permissions?: string; times_expire?: number; extension?: number; status?: string
}) {
  return request({ url: '/console/systems/secretsSave', method: 'post', data })
}
export async function secretsList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  const col = data.sort ? data.sort.replace(/^[+-]/, '') : ''
  const order = col ? [{ column: col, order: data.sort!.startsWith('-') ? 'DESC' : 'ASC' }] : undefined
  const limit = data.pageSize || 20
  const offset = ((data.page || 1) - 1) * limit
  const result = await requestBridge.getList({
    ipc: { table: 'secrets', filters: data.filter || {}, order, limit, offset },
    http: { url: '/console/systems/secretsList', data },
  })
  return { data: result }
}

// ============ 多语言 ============
export function languagesSort(data: { id?: number | number[]; sort?: string }) {
  return request({ url: '/console/systems/languagesSort', method: 'post', data })
}
export function languagesRestore(data: { id?: number | number[] }) {
  return request({ url: '/console/systems/languagesRestore', method: 'post', data })
}
export function languagesDelete(data: { id?: number | number[] }) {
  return request({ url: '/console/systems/languagesDelete', method: 'post', data })
}
export async function languagesDetail(data: { id?: number | number[] }) {
  const id = Array.isArray(data.id) ? data.id[0] : data.id
  const result = await requestBridge.getOne({
    ipc: { table: 'languages', id },
    http: { url: '/console/systems/languagesDetail', data },
  })
  return { data: result }
}
export function languagesDisable(data: { id?: number | number[] }) {
  return request({ url: '/console/systems/languagesDisable', method: 'post', data })
}
export function languagesEnable(data: { id?: number | number[] }) {
  return request({ url: '/console/systems/languagesEnable', method: 'post', data })
}
export function languagesSave(data: {
  id?: number; name?: string; code?: string; abbreviation?: string; icon?: string; extension?: object; sort?: number; status?: number
}) {
  return request({ url: '/console/systems/languagesSave', method: 'post', data })
}
export async function languagesList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  const col = data.sort ? data.sort.replace(/^[+-]/, '') : ''
  const order = col ? [{ column: col, order: data.sort!.startsWith('-') ? 'DESC' : 'ASC' }] : undefined
  const limit = data.pageSize || 20
  const offset = ((data.page || 1) - 1) * limit
  const result = await requestBridge.getList({
    ipc: { table: 'languages', filters: data.filter || {}, order, limit, offset },
    http: { url: '/console/systems/languagesList', data },
  })
  return { data: result }
}

// ============ 应用服务 ============
export function serversRestore(data: { id?: number | number[] }) {
  return request({ url: '/console/systems/serversRestore', method: 'post', data })
}
export function serversDelete(data: { id?: number | number[] }) {
  return request({ url: '/console/systems/serversDelete', method: 'post', data })
}
export async function serversDetail(data: { id?: number | number[] }) {
  const id = Array.isArray(data.id) ? data.id[0] : data.id
  const result = await requestBridge.getOne({
    ipc: { table: 'servers', id },
    http: { url: '/console/systems/serversDetail', data },
  })
  return { data: result }
}
export function serversDisable(data: { id?: number | number[] }) {
  return request({ url: '/console/systems/serversDisable', method: 'post', data })
}
export function serversEnable(data: { id?: number | number[] }) {
  return request({ url: '/console/systems/serversEnable', method: 'post', data })
}
export function serversSave(data: {
  id?: number; name?: string; url?: string; key?: string; app_id?: string; extension?: number; status?: string
}) {
  return request({ url: '/console/systems/serversSave', method: 'post', data })
}
export async function serversList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  const order = data.sort ? [{ column: data.sort.startsWith('-') ? data.sort.slice(1) : data.sort, order: data.sort.startsWith('-') ? 'DESC' : 'ASC' }] : undefined
  const limit = data.pageSize || 20
  const offset = ((data.page || 1) - 1) * limit
  const result = await requestBridge.getList({
    ipc: { table: 'servers', filters: data.filter || {}, order, limit, offset },
    http: { url: '/console/systems/serversList', data },
  })
  return { data: result }
}

// ============ 环境配置 ============
export function configsRestore(data: { id?: number | number[] }) {
  return request({ url: '/console/systems/configsRestore', method: 'post', data })
}
export function configsDelete(data: { id?: number | number[] }) {
  return request({ url: '/console/systems/configsDelete', method: 'post', data })
}
export async function configsDetail(data: { id?: number | number[] }) {
  const id = Array.isArray(data.id) ? data.id[0] : data.id
  const result = await requestBridge.getOne({
    ipc: { table: 'configs', id },
    http: { url: '/console/systems/configsDetail', data },
  })
  return { data: result }
}
export function configsSave(data: { id?: number; key?: string; value?: string }) {
  return request({ url: '/console/systems/configsSave', method: 'post', data })
}
export async function configsList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  const order = data.sort ? [{ column: data.sort.startsWith('-') ? data.sort.slice(1) : data.sort, order: data.sort.startsWith('-') ? 'DESC' : 'ASC' }] : undefined
  const limit = data.pageSize || 20
  const offset = ((data.page || 1) - 1) * limit
  const result = await requestBridge.getList({
    ipc: { table: 'configs', filters: data.filter || {}, order, limit, offset },
    http: { url: '/console/systems/configsList', data },
  })
  return { data: result }
}

// ============ 缓存管理 ============
export function cachesClear() {
  return request({ url: '/console/systems/cachesClear', method: 'post' })
}

export { requestBridge }
