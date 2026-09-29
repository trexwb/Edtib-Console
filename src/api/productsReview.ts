/**
 * 待校对标准 API
 */
import request from '/@/utils/request'

/* 待校对标准列表 */
export function productsReviewList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  return request({ url: '/console/standards/productsReviewList', method: 'post', data })
}

/* 待校对标准同步 */
export function productsReviewSync(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/productsReviewSync', method: 'post', data })
}

/* 待校对标准详细 */
export function productsReviewDetail(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/productsReviewDetail', method: 'post', data })
}

/* 待校对标准审核 */
export function productsReviewStatus(data: { id?: number | number[]; remark?: string; status?: number }) {
  return request({ url: '/console/standards/productsReviewStatus', method: 'post', data })
}

/* 待校对标准保存 */
export function productsReviewSave(data: {
  id?: number | number[]; standard_id?: string; categories_id?: object; shapes_id?: object; names?: object;
  grade?: string; code?: string; year?: string; detail?: object; covers?: object; svgs?: object;
  cads?: object; assemblies?: object; models?: object; parameters?: object; diameter_length?: object;
  drawing_limit?: string; extension?: string; status?: number
}) {
  return request({ url: '/console/standards/productsReviewSave', method: 'post', data })
}
