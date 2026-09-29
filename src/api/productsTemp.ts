/**
 * 临时标准库 API
 */
import request from '/@/utils/request'

/* 临时标准列表 */
export function productsTempList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  return request({ url: '/console/standards/productsTempList', method: 'post', data })
}

/* 临时标准详细 */
export function productsTempDetail(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/productsTempDetail', method: 'post', data })
}

/* 临时标准提交审核【批量】 */
export function productsTempSubmit(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/productsTempSubmit', method: 'post', data })
}

/* 临时标准还原【批量】 */
export function productsTempRestore(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/productsTempRestore', method: 'post', data })
}

/* 临时标准删除【批量】 */
export function productsTempDelete(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/productsTempDelete', method: 'post', data })
}

/* 临时标准保存 */
export function productsTempSave(data: {
  id?: number; standard_id?: string; categories_id?: object; shapes_id?: object; names?: object;
  grade?: string; code?: string; year?: string; detail?: object; covers?: object; svgs?: object;
  cads?: object; assemblies?: object; models?: object; parameters?: object; diameter_length?: object;
  drawing_limit?: string; extension?: string; status?: number
}) {
  return request({ url: '/console/standards/productsTempSave', method: 'post', data })
}

/* 临时标准详情 */
export function productsTempSort(data: { id?: number | number[]; sort?: number }) {
  return request({ url: '/console/standards/productsTempSort', method: 'post', data })
}
