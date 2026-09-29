/**
 * 下载记录 API
 */
import request from '/@/utils/request'

export function downloadsList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  return request({ url: '/console/standards/downloadsList', method: 'post', data })
}
