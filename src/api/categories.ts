/**
 * 产品分类 API（离线优先）
 * @Author: trexwb
 * @Date: 2026-04-16
 */
import request from '/@/utils/request'
import requestBridge from '/@/utils/requestBridge'

/* 产品分类排序 */
export function categoriesSort(data: { id?: number | number[]; sort?: string; parent_id?: number | string }) {
  return request({
    url: '/console/standards/categoriesSort',
    method: 'post',
    data,
  })
}

/* 产品分类详细 */
export async function categoriesDetail(data: { id?: number | number[] }) {
  const id = Array.isArray(data.id) ? data.id[0] : data.id
  const result = await requestBridge.getOne({
    ipc: { table: 'categories', id },
    http: { url: '/console/standards/categoriesDetail', data },
  })
  return { data: result }
}

/* 产品分类还原【批量】 */
export function categoriesRestore(data: { id?: number | number[] }) {
  return request({
    url: '/console/standards/categoriesRestore',
    method: 'post',
    data,
  })
}

/* 产品分类删除【批量】 */
export function categoriesDelete(data: { id?: number | number[] }) {
  return request({
    url: '/console/standards/categoriesDelete',
    method: 'post',
    data,
  })
}

/* 产品分类禁用【批量】 */
export function categoriesDisable(data: { id?: number | number[] }) {
  return request({
    url: '/console/standards/categoriesDisable',
    method: 'post',
    data,
  })
}

/* 产品分类启用【批量】 */
export function categoriesEnable(data: { id?: number | number[] }) {
  return request({
    url: '/console/standards/categoriesEnable',
    method: 'post',
    data,
  })
}

/* 产品分类保存 */
export function categoriesSave(data: {
  id?: number | number[]
  parent_id?: number | string
  names?: object
  abbreviation?: string
  remarks?: object
  covers?: object
  extension?: object
  status?: number
  sort?: number
}) {
  return request({
    url: '/console/standards/categoriesSave',
    method: 'post',
    data,
  })
}

/* 产品分类列表 */
export async function categoriesList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  const col = data.sort ? data.sort.replace(/^[+-]/, '') : ''
  const order = col
    ? [{ column: col, order: data.sort!.startsWith('-') ? 'DESC' : 'ASC' }]
    : undefined
  const limit = data.pageSize || 20
  const offset = ((data.page || 1) - 1) * limit
  
  const result = await requestBridge.getList({
    ipc: { table: 'categories', filters: data.filter || {}, order, limit, offset },
    http: { url: '/console/standards/categoriesList', data },
  })
  return { data: result }
}

/* 产品分类全部 */
export async function categoriesAll() {
  const result = await requestBridge.getAll({
    ipc: { table: 'categories', filters: { status: 1 } },
    http: { url: '/console/standards/categoriesAll' },
  })
  return { data: result }
}

export { requestBridge }
