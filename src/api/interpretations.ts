/**
 * 标准解读 API
 */
import request from '/@/utils/request'

export function interpretationsRestore(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/interpretationsRestore', method: 'post', data })
}
export function interpretationsDelete(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/interpretationsDelete', method: 'post', data })
}
export function interpretationsDetail(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/interpretationsDetail', method: 'post', data })
}
export function interpretationsDisable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/interpretationsDisable', method: 'post', data })
}
export function interpretationsEnable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/interpretationsEnable', method: 'post', data })
}
export function interpretationsSave(data: { id?: number; names?: object; type?: string; extension?: object; status?: number }) {
  return request({ url: '/console/standards/interpretationsSave', method: 'post', data })
}
export function interpretationsList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  return request({ url: '/console/standards/interpretationsList', method: 'post', data })
}
