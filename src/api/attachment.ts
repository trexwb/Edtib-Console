/**
 * 附件 API（离线优先）
 * @Author: trexwb
 * @Date: 2026-04-16
 */
import request from '/@/utils/request'
import requestBridge from '/@/utils/requestBridge'

/* 获取签名（用于文件上传） */
export function getSign(data: { open?: boolean }) {
  // 签名需要在线获取
  return request({ url: '/console/attachments/getSign', method: 'post', data })
}

/* 读取本地缓存签名 */
export async function getCachedSign() {
  const cached = await requestBridge.readFile({
    ipc: { filePath: 'attachments/sign-cache.json' },
  })
  if (cached) {
    return { data: JSON.parse(cached) }
  }
  return null
}

export { requestBridge }
