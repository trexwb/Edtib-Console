/**
 * 材料标准 API
 */
import request from '/@/utils/request'

export function materialsSort(data: { id?: number | number[]; sort?: string }) {
  return request({ url: '/console/standards/materialsSort', method: 'post', data })
}
export function materialsRestore(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/materialsRestore', method: 'post', data })
}
export function materialsDelete(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/materialsDelete', method: 'post', data })
}
export function materialsDetail(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/materialsDetail', method: 'post', data })
}
export function materialsDisable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/materialsDisable', method: 'post', data })
}
export function materialsEnable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/materialsEnable', method: 'post', data })
}
export function materialsSave(data: { id?: number; names?: object; abbreviation?: string; remarks?: object; covers?: object; extension?: object; status?: number; sort?: number }) {
  return request({ url: '/console/standards/materialsSave', method: 'post', data })
}
export function materialsList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  return request({ url: '/console/standards/materialsList', method: 'post', data })
}
export function materialsAll() {
  return request({ url: '/console/standards/materialsAll', method: 'post' })
}

// ── 材料类别管理（materialCategories*：随材料标准管理页维护） ──
export function materialCategoriesList(data: { filter?: object; sort?: string; page?: number; pageSize?: number }) {
  return request({ url: '/console/standards/materialCategoriesList', method: 'post', data })
}

export function materialCategoriesDetail(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/materialCategoriesDetail', method: 'post', data })
}

export function materialCategoriesSave(data: { id?: number; code?: string; names?: object; abbreviation?: string; covers?: object; status?: number; sort?: number }) {
  return request({ url: '/console/standards/materialCategoriesSave', method: 'post', data })
}

export function materialCategoriesSort(data: { id?: number | number[]; sort?: string }) {
  return request({ url: '/console/standards/materialCategoriesSort', method: 'post', data })
}

export function materialCategoriesEnable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/materialCategoriesEnable', method: 'post', data })
}

export function materialCategoriesDisable(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/materialCategoriesDisable', method: 'post', data })
}

export function materialCategoriesRestore(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/materialCategoriesRestore', method: 'post', data })
}

export function materialCategoriesDelete(data: { id?: number | number[] }) {
  return request({ url: '/console/standards/materialCategoriesDelete', method: 'post', data })
}
