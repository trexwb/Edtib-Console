/**
 * 变量设置 API（离线优先）
 * @Author: trexwb
 * @Date: 2026-04-16
 */
import request from '/@/utils/request'
import requestBridge from '/@/utils/requestBridge'

/* 变量排序 */
export function variablesSort(data: { id?: number | number[]; sort?: number }) {
  return request({ url: '/console/standards/variablesSort', method: 'post', data })
}

/* 变量还原【批量】 */
export function variablesRestore(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/variablesRestore', method: 'post', data })
}

/* 变量删除【批量】 */
export function variablesDelete(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/variablesDelete', method: 'post', data })
}

/* 变量详细 */
export async function variablesDetail(data: { id?: number | number[] }) {
  const id = Array.isArray(data.id) ? data.id[0] : data.id
  const result = await requestBridge.getOne({
    ipc: { table: 'variables', id },
    http: { url: '/console/standards/variablesDetail', data },
  })
  return { data: result }
}

/* 变量禁用【批量】 */
export function variablesDisable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/variablesDisable', method: 'post', data })
}

/* 变量启用【批量】 */
export function variablesEnable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/variablesEnable', method: 'post', data })
}

/* 变量保存 */
export function variablesSave(data: {
  id?: number | number[]
  type?: string | number
  code?: string
  variable?: string
  extension?: object
  status?: number | string
  sort?: number | string
}) {
  return request({ url: '/console/standards/variablesSave', method: 'post', data })
}

/* 变量列表 */
export async function variablesList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  const col = data.sort ? data.sort.replace(/^[+-]/, '') : ''
  const order = col
    ? [{ column: col, order: data.sort!.startsWith('-') ? 'DESC' : 'ASC' }]
    : undefined
  const limit = data.pageSize || 20
  const offset = ((data.page || 1) - 1) * limit
  
  const result = await requestBridge.getList({
    ipc: { table: 'variables', filters: data.filter || {}, order, limit, offset },
    http: { url: '/console/standards/variablesList', data },
  })
  return { data: result }
}

/* 变量全部 */
export async function variablesAll() {
  const result = await requestBridge.getAll({
    ipc: { table: 'variables', filters: { status: 1 } },
    http: { url: '/console/standards/variablesAll' },
  })
  return { data: result }
}

export { requestBridge }
