/**
 * 授权认证 API（离线优先）
 * @Author: trexwb
 * @Date: 2026-04-16
 */
import request from '/@/utils/request'
import CryptoJS from 'crypto-js'
import requestBridge from '/@/utils/requestBridge'

const md5 = (str: string) => {
  return CryptoJS.MD5(str).toString()
}

/* 密码登录 */
export async function login(data: { username?: string; password?: string }) {
  data.password = md5(data.password || '')
  const result = await request({ url: '/console/authorize/signIn', method: 'post', data })
  // 登录成功后缓存用户信息
  // if (result?.data?.auth_token && requestBridge.isElectron()) {
  //   await requestBridge.writeFile({
  //     ipc: { filePath: 'user/login-cache.json', data: JSON.stringify(result.data) },
  //   })
  // }
  return result
}

/* 获取用户信息 */
export async function getUserInfo() {
  // 优先读取本地缓存
  const cached = await requestBridge.readFile({
    ipc: { filePath: 'user/login-cache.json' },
  })
  if (cached) {
    const cacheData = typeof cached == 'object' ? cached : JSON.parse(cached)
    if (cacheData?.user) {
      return {
        data: {
          ...cacheData.user,
          token: cacheData.token,
          roles: cacheData.roles,
          permissions: cacheData.permissions,
        },
      }
    }
  }
  // Fallback HTTP
  const result = await request({ url: '/console/authorize/signInfo', method: 'post' })
  // 更新缓存
  if (result?.data && requestBridge.isElectron()) {
    await requestBridge.writeFile({
      ipc: { filePath: 'user/login-cache.json', data: JSON.stringify(result.data) },
    })
  }
  return result
}

/* 退出登录 */
export async function logout() {
  // 清空本地缓存
  if (requestBridge.isElectron()) {
    await requestBridge.writeFile({
      ipc: { filePath: 'user/login-cache.json', data: '' },
    })
  }
  return request({ url: '/console/authorize/logout', method: 'post' })
}

export { requestBridge }
