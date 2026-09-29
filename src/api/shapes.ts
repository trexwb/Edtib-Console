/**
 * 形状分类 API（离线优先）
 * @Author: trexwb
 * @Date: 2026-04-16
 */
import request from '/@/utils/request'
import requestBridge from '/@/utils/requestBridge'

/* 形状分类排序 */
export function shapesSort(data: { id?: number | number[]; sort?: string | number }) {
  return request({ url: '/console/standards/shapesSort', method: 'post', data })
}

/* 形状分类还原【批量】 */
export function shapesRestore(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/shapesRestore', method: 'post', data })
}

/* 形状分类删除【批量】 */
export function shapesDelete(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/shapesDelete', method: 'post', data })
}

/* 形状分类详细 */
export async function shapesDetail(data: { id?: number | number[] }) {
  const id = Array.isArray(data.id) ? data.id[0] : data.id
  const result = await requestBridge.getOne({
    ipc: { table: 'shapes', id },
    http: { url: '/console/standards/shapesDetail', data },
  })
  return { data: result }
}

/* 形状分类禁用【批量】 */
export function shapesDisable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/shapesDisable', method: 'post', data })
}

/* 形状分类启用【批量】 */
export function shapesEnable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/shapesEnable', method: 'post', data })
}

/* 形状分类保存 */
export function shapesSave(data: {
  id?: number | number[]
  location?: string
  names?: object
  abbreviation?: string
  remarks?: object
  covers?: object
  extension?: object
  status?: number
  sort?: number
}) {
  return request({ url: '/console/standards/shapesSave', method: 'post', data })
}

/* 形状分类列表 */
export async function shapesList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  const col = data.sort ? data.sort.replace(/^[+-]/, '') : ''
  const order = col
    ? [{ column: col, order: data.sort!.startsWith('-') ? 'DESC' : 'ASC' }]
    : undefined
  const limit = data.pageSize || 20
  const offset = ((data.page || 1) - 1) * limit
  
  const result = await requestBridge.getList({
    ipc: { table: 'shapes', filters: data.filter || {}, order, limit, offset },
    http: { url: '/console/standards/shapesList', data },
  })
  return { data: result }
}

/* 形状分类全部数据 */
export async function shapesAll() {
  const result = await requestBridge.getAll({
    ipc: { table: 'shapes', filters: { status: 1 } },
    http: { url: '/console/standards/shapesAll' },
  })
  return { data: result }
}

export { requestBridge }
