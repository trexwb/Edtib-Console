/**
 * 表面处理 API
 */
import request from '/@/utils/request'

export function exteriorsSort(data: { id?: number | number[]; sort?: string }) {
  return request({ url: '/console/standards/exteriorsSort', method: 'post', data })
}
export function exteriorsRestore(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/exteriorsRestore', method: 'post', data })
}
export function exteriorsDelete(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/exteriorsDelete', method: 'post', data })
}
export function exteriorsDetail(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/exteriorsDetail', method: 'post', data })
}
export function exteriorsDisable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/exteriorsDisable', method: 'post', data })
}
export function exteriorsEnable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/exteriorsEnable', method: 'post', data })
}
export function exteriorsSave(data: { id?: number; names?: object; abbreviation?: string; remarks?: object; covers?: object; extension?: object; status?: number; sort?: number }) {
  return request({ url: '/console/standards/exteriorsSave', method: 'post', data })
}
export function exteriorsList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  return request({ url: '/console/standards/exteriorsList', method: 'post', data })
}
export function exteriorsAll() {
  return request({ url: '/console/standards/exteriorsAll', method: 'post' })
}
