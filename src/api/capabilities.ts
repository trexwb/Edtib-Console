/**
 * 性能标准 API（预留）
 */
import request from '/@/utils/request'

// 预留扩展位置
export function capabilitiesSort(data: { id?: number | number[]; sort?: string }) {
  return request({ url: '/console/standards/capabilitiesSort', method: 'post', data })
}
export function capabilitiesList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  return request({ url: '/console/standards/capabilitiesList', method: 'post', data })
}
