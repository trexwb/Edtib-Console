/**
 * 公共配置 API（离线优先）
 * @Author: trexwb
 * @Date: 2026-04-16
 */
import request from '/@/utils/request'
import requestBridge from '/@/utils/requestBridge'

/* 环境配置常量 */
export function configEnum() {
  return request({ url: '/console/common/configs', method: 'post' }).then((res: any) => {
    return res.data || {};
  });
}

/* 路由配置 */
export function getRoutesPath() {
  // 路由配置不缓存，每次从服务器获取
  return request({ url: '/console/common/routes', method: 'post' })
}

/* 待执行任务 */
export function getWorksPath() {
  return request({ url: '/console/common/works', method: 'post' })
}

export { requestBridge }
