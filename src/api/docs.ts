/**
 * 文档管理 API（离线优先）
 * @Author: trexwb
 * @Date: 2026-04-16
 */
import request from '/@/utils/request'
import requestBridge from '/@/utils/requestBridge'

/* 文档原件下载 */
export function docsDownload(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/docsDownload', method: 'post', data })
}

/* 文档还原 */
export function docsRestore(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/docsRestore', method: 'post', data })
}

/* 文档删除【批量】 */
export function docsDelete(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/docsDelete', method: 'post', data })
}

/* 文档详细 */
export async function docsDetail(data: { id?: number | number[] }) {
  const id = Array.isArray(data.id) ? data.id[0] : data.id
  const result = await requestBridge.getOne({
    ipc: { table: 'docs', id },
    http: { url: '/console/standards/docsDetail', data },
  })
  return { data: result }
}

/* 文档禁用【批量】 */
export function docsDisable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/docsDisable', method: 'post', data })
}

/* 文档启用【批量】 */
export function docsEnable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/docsEnable', method: 'post', data })
}

/* 文档保存 */
export function docsSave(data: {
  id?: number; names?: object; type?: string; extension?: object; status?: number
}) {
  return request({ url: '/console/standards/docsSave', method: 'post', data })
}

/* 文档列表 */
export async function docsList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  const col = data.sort ? data.sort.replace(/^[+-]/, '') : ''
  const order = col ? [{ column: col, order: data.sort!.startsWith('-') ? 'DESC' : 'ASC' }] : undefined
  const limit = data.pageSize || 20
  const offset = ((data.page || 1) - 1) * limit
  const result = await requestBridge.getList({
    ipc: { table: 'docs', filters: data.filter || {}, order, limit, offset },
    http: { url: '/console/standards/docsList', data },
  })
  return { data: result }
}

export { requestBridge }
