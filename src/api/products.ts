/**
 * 正式标准库 API（离线优先）
 * 优先使用 IPC 直连本地数据库，失败时 fallback 到 HTTP
 * @Author: trexwb
 * @Date: 2026-04-16
 */
import request from '/@/utils/request'
import requestBridge from '/@/utils/requestBridge'

/* 正式标准列表
filter: {
  keywords 关键字
  standard_id
  shape_id
  category_id
  id 编号
  code 标准编号
  status 状态搜索:0禁用，1启用
}
*/
export function productsList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  return request({ url: '/console/standards/productsList', method: 'post', data })
}

/* 正式标准详细 */
export async function productsDetail(data: { id?: number | number[] }) {
  const id = Array.isArray(data.id) ? data.id[0] : data.id
  const result = await requestBridge.getOne({
    ipc: {
      table: 'products',
      id,
    },
    http: {
      url: '/console/standards/productsDetail',
      data,
    },
  })
  return { data: result }
}

/* 正式标准还原【批量】 */
export function productsRestore(data: { id?: number | number[] }) {
  // 修改操作必须在线执行
  return request({
    url: '/console/standards/productsRestore',
    method: 'post',
    data,
  })
}

/* 正式标准删除【批量】 */
export function productsDelete(data: { id?: number | number[] }) {
  // 修改操作必须在线执行
  return request({
    url: '/console/standards/productsDelete',
    method: 'post',
    data,
  })
}

/* 正式标准禁用【批量】 */
export function productsDisable(data: { id?: number | number[] }) {
  // 修改操作必须在线执行
  return request({
    url: '/console/standards/productsDisable',
    method: 'post',
    data,
  })
}

/* 正式标准启用【批量】 */
export function productsEnable(data: { id?: number | number[] }) {
  // 修改操作必须在线执行
  return request({
    url: '/console/standards/productsEnable',
    method: 'post',
    data,
  })
}

/**
 * 保存产品标准
 */
export function productsSave(data: {
  id?: string
  standard_id?: string
  categories_id?: object
  shapes_id?: object
  names?: object
  grade?: string
  code?: string
  year?: string
  detail?: object
  covers?: object
  svgs?: object
  cads?: object
  assemblies?: object
  models?: object
  parameters?: object
  diameter_length?: object
  drawing_limit?: string
  extension?: string
  sort?: number,
  status: number
}) {
  // 修改操作必须在线执行
  return request({
    url: '/console/standards/productsSave',
    method: 'post',
    data,
  })
}

/* 正式标准排序 */
export function productsSort(data: { id?: number | number[]; sort?: number }) {
  // 修改操作必须在线执行
  return request({
    url: '/console/standards/productsSort',
    method: 'post',
    data,
  })
}

// 导出 requestBridge 供其他模块使用
export { requestBridge }
