/**
 * 标准分类 API（离线优先）
 * @Author: trexwb
 * @Date: 2026-04-16
 */
import request from '/@/utils/request'
import requestBridge from '/@/utils/requestBridge'

/* 标准分类排序 */
export function standardsSort(data: { id?: number | number[]; sort?: number }) {
  return request({ url: '/console/standards/standardsSort', method: 'post', data })
}

/* 标准分类还原【批量】*/
export function standardsRestore(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/standardsRestore', method: 'post', data })
}

/* 标准分类删除【批量】*/
export function standardsDelete(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/standardsDelete', method: 'post', data })
}

/* 标准分类详细 */
export async function standardsDetail(data: { id?: number | number[] }) {
  const id = Array.isArray(data.id) ? data.id[0] : data.id
  const result = await requestBridge.getOne({
    ipc: { table: 'standards', id },
    http: { url: '/console/standards/standardsDetail', data },
  })
  return { data: result }
}

/* 标准分类禁用【批量】*/
export function standardsDisable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/standardsDisable', method: 'post', data })
}

/* 标准分类启用【批量】*/
export function standardsEnable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/standardsEnable', method: 'post', data })
}

/* 标准分类保存 */
export function standardsSave(data: {
  id?: number
  names?: object
  abbreviation?: string
  remarks?: object
  covers?: object
  extension?: object
  status?: number
  sort?: number
}) {
  return request({ url: '/console/standards/standardsSave', method: 'post', data })
}

/* 标准分类列表 */
export async function standardsList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  const col = data.sort ? data.sort.replace(/^[+-]/, '') : ''
  const order = col
    ? [{ column: col, order: data.sort!.startsWith('-') ? 'DESC' : 'ASC' }]
    : undefined
  const limit = data.pageSize || 20
  const offset = ((data.page || 1) - 1) * limit
  
  const result = await requestBridge.getList({
    ipc: { table: 'standards', filters: data.filter || {}, order, limit, offset },
    http: { url: '/console/standards/standardsList', data },
  })
  return { data: result }
}

/* 标准分类全部数据 */
export async function standardsAll() {
  const result = await requestBridge.getAll({
    ipc: { table: 'standards', filters: { status: 1 } },
    http: { url: '/console/standards/standardsAll' },
  })
  return { data: result }
}

export { requestBridge }
