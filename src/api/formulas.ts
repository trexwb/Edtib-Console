/**
 * 公式管理 API（离线优先）
 * @Author: trexwb
 * @Date: 2026-04-16
 */
import request from '/@/utils/request'
import requestBridge from '/@/utils/requestBridge'

/* 公式排序 */
export function formulasSort(data: { id?: number | number[]; sort?: number }) {
  return request({ url: '/console/standards/formulasSort', method: 'post', data })
}

/* 公式还原【批量】 */
export function formulasRestore(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/formulasRestore', method: 'post', data })
}

/* 公式删除【批量】 */
export function formulasDelete(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/formulasDelete', method: 'post', data })
}

/* 公式详细 */
export async function formulasDetail(data: { id?: number | number[] }) {
  const id = Array.isArray(data.id) ? data.id[0] : data.id
  const result = await requestBridge.getOne({
    ipc: { table: 'formulas', id },
    http: { url: '/console/standards/formulasDetail', data },
  })
  return { data: result }
}

/* 公式禁用【批量】 */
export function formulasDisable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/formulasDisable', method: 'post', data })
}

/* 公式启用【批量】 */
export function formulasEnable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/formulasEnable', method: 'post', data })
}

/* 公式保存 */
export function formulasSave(data: {
  id?: number | number[]
  shape_id?: string | number
  names?: object
  code?: string
  columnar?: string
  remarks?: object
  extension?: object
  status?: number | string
  sort?: number | string
}) {
  return request({ url: '/console/standards/formulasSave', method: 'post', data })
}

/* 公式列表 */
export async function formulasList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  const col = data.sort ? data.sort.replace(/^[+-]/, '') : ''
  const order = col
    ? [{ column: col, order: data.sort!.startsWith('-') ? 'DESC' : 'ASC' }]
    : undefined
  const limit = data.pageSize || 20
  const offset = ((data.page || 1) - 1) * limit
  
  const result = await requestBridge.getList({
    ipc: { table: 'formulas', filters: data.filter || {}, order, limit, offset },
    http: { url: '/console/standards/formulasList', data },
  })
  return { data: result }
}

/* 公式全部 */
export async function formulasAll() {
  const result = await requestBridge.getAll({
    ipc: { table: 'formulas', filters: { status: 1 } },
    http: { url: '/console/standards/formulasAll' },
  })
  return { data: result }
}

export { requestBridge }
