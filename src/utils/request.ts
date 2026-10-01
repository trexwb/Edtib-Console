/***
 * @Author: ${git_name}
 * @Date: 2026-07-02 18:04:53
 * @LastEditors: ${git_name}
 * @LastEditTime: 2026-09-03 09:40:52
 * @FilePath: /console/web/src/utils/request.ts
 * @Description:
 * @一花一世界，一叶一如来
 * @Copyright (c) 2026 by 杭州大美, All Rights Reserved.
 */
import { stringify } from 'qs'
// import { refreshToken } from '/@/api/refreshToken';
import { translate } from '/@/i18n'
import { contentType, debounce, messageName, statusName, successCode, timeout } from '/@/config'
import router from '/@/router'
import { useUserStore } from '/@/store/modules/user'
import { isArray } from '/@/utils/validate'
import { isTauri } from '/@/utils/host'
import { createTauriProxyAdapter } from '/@/utils/tauriAdapter'
import { addErrorLog, needErrorLog } from '/@vab/plugins/errorLog'
import { gp } from '/@vab/plugins/vab'

// console.log('NODE_ENV:', import.meta.env.VITE_USER_NODE_ENV)

import CryptoJS from 'crypto-js'

const md5 = (str: string) => {
  return CryptoJS.MD5(str).toString()
}

// 使用更安全的哈希算法 SHA - 256 替换 MD5
const sha256 = (str: string): string => {
  return CryptoJS.SHA256(str).toString()
}

// 加密函数
// 与后端约定一致：每次加密使用随机 IV，返回格式为 iv(hex) + ':' + 密文(hex)
const encrypt = (encryptedData: any, key: string): string => {
  if (key.length !== 32) {
    throw new Error('Invalid key length')
  }
  // 将 key 转换为 CryptoJS WordArray 格式
  const keyWordArray = CryptoJS.enc.Utf8.parse(key)

  // 每次加密生成随机 16 字节 IV
  const ivWordArray = CryptoJS.lib.WordArray.random(16)

  const encryptedText = JSON.stringify(encryptedData)
  const encrypted = CryptoJS.AES.encrypt(encryptedText, keyWordArray, { iv: ivWordArray }).ciphertext.toString(CryptoJS.enc.Hex)
  return ivWordArray.toString(CryptoJS.enc.Hex) + ':' + encrypted
}
// 解密函数
// 后端加密约定：每次使用随机 IV，返回格式为 iv(hex) + ':' + 密文(hex)
const decrypt = (encryptedText: string, key: string): any => {
  if (key.length !== 32) {
    throw new Error('Invalid key length')
  }
  // 将 key 转换为 CryptoJS WordArray 格式
  const keyWordArray = CryptoJS.enc.Utf8.parse(key)

  // 从密文中拆出前置的随机 IV 与真正的密文
  const sepIndex = encryptedText.indexOf(':')
  if (sepIndex <= 0) {
    throw new Error('Invalid encrypted format, expected iv:payload')
  }
  const ivHex = encryptedText.slice(0, sepIndex)
  const cipherHex = encryptedText.slice(sepIndex + 1)
  const ivWordArray = CryptoJS.enc.Hex.parse(ivHex)
  if (ivWordArray.sigBytes !== 16) {
    throw new Error(`Invalid iv length: ${ivWordArray.sigBytes} bytes`)
  }
  // console.log('iv length(bytes):', ivWordArray.sigBytes, 'cipher hex length:', cipherHex.length)

  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Hex.parse(cipherHex),
  })
  const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWordArray, { iv: ivWordArray }).toString(CryptoJS.enc.Utf8)
  if (import.meta.env.VITE_USER_NODE_ENV === 'development') console.log('Decrypted string:', decrypted)
  // 验证解密后的字符串是否为有效的 JSON
  try {
    return JSON.parse(decrypted)
  } catch (jsonError) {
    throw new Error('Invalid JSON format after decryption')
  }
}

// C-G3: 生成防重放 nonce（32 位字母数字，供 App-Nonce 头与签名计算使用）
// 必须使用密码学随机源：Math.random 可预测，会让防重放 nonce 失去意义
const NONCE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const generateNonce = (): string => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let result = ''
  for (let i = 0; i < bytes.length; i++) result += NONCE_ALPHABET.charAt(bytes[i] % NONCE_ALPHABET.length)
  return result
}

let loadingInstance: any

// 操作正常Code数组
const codeVerificationArray = isArray(successCode) ? [...successCode] : [...[successCode]]
const CODE_MESSAGE: any = {
  200: '服务器成功返回请求数据',
  201: '新建或修改数据成功',
  202: '一个请求已经进入后台排队(异步任务)',
  204: '删除数据成功',
  400: '发出信息有误',
  401: '用户没有权限(令牌失效、用户名、密码错误、登录过期)',
  402: '令牌过期',
  403: '用户得到授权，但是访问是被禁止的',
  404: '访问资源不存在',
  406: '请求格式不可得',
  410: '请求资源被永久删除，且不会被看到',
  500: '服务器发生错误',
  502: '网关错误',
  503: '服务不可用，服务器暂时过载或维护',
  504: '网关超时',

  404006001: '账号密码错误',
}

/**
 * axios请求拦截器配置
 * @param config
 * @returns {any}
 */
const requestConf = (config: any): any => {
  if (config.retryCount === undefined) config.retryCount = 0
  const userStore = useUserStore()
  const { token } = userStore
  // 不规范写法 可根据setting.config.js tokenName配置随意自定义headers
  // if (token) config.headers[tokenName] = token
  const timeStamp = Math.floor(Date.now() / 1000).toString()
  const nonce = generateNonce()
  config.headers['App-Id'] = `${import.meta.env.VITE_APP_ID}`
  // C-G3: nonce 参与签名计算并随请求头发送，服务端缓存去重防重放
  config.headers['App-Nonce'] = nonce
  config.headers['App-Secret'] =
    md5(`${sha256(`${import.meta.env.VITE_APP_ID}${timeStamp}${nonce}`)}${import.meta.env.VITE_APP_SECRET}`) + timeStamp

  // 规范写法 不可随意自定义
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
    // config.headers['Auth-Token'] = `${token}`
  }

  // 网络错误重试会再次进入拦截器：以首次的原始 body 为准，避免对密文二次加密
  if (config.plainData === undefined) config.plainData = config.data
  const plainData = config.plainData

  if (import.meta.env.VITE_REQUEST_ENCRYPT === 'true' && plainData) {
    config.data = {
      encryptedData: encrypt(plainData, import.meta.env.VITE_APP_SECRET),
    }
  }

  if (config.data && config.headers['Content-Type'] === 'application/x-www-form-urlencoded;charset=UTF-8')
    config.data = stringify(config.data)
  if (debounce.some((item: string) => config.url.includes(item))) loadingInstance = gp.$baseLoading()

  return config
}

/**
 * axios响应拦截器
 * @param config {any} 请求配置
 * @param data {any} response数据
 * @param status {any} HTTP status
 * @param statusText {any} HTTP status text
 * @returns {Promise<*|*>}
 */
const handleData = async ({
  headers,
  config,
  data,
  status,
  statusText,
}: {
  headers: any
  config: any
  data: any
  status: any
  statusText: any
}): Promise<any | any> => {
  const { resetAll, setToken } = useUserStore()
  if (headers['auth-token']) setToken(headers['auth-token'])
  if (import.meta.env.VITE_USER_NODE_ENV === 'development') console.log('headers:', { ...headers })
  if (loadingInstance) loadingInstance.close()
  // 若data.code存在，覆盖默认code
  let statusCode = data && data[statusName] ? data[statusName] : status
  let code = data && data[statusName] ? Number((data[statusName] || 200).toString().substring(0, 3)) : status
  // 若code属于操作正常code，则status修改为200
  if (codeVerificationArray.indexOf(data[statusName]) + 1) code = 200
  if (import.meta.env.VITE_RETURN_ENCRYPT === 'true' && data?.encryptedData) {
    // 有加密返回时解密
    data.data = await decrypt(data.encryptedData, import.meta.env.VITE_APP_SECRET)
    if (import.meta.env.VITE_USER_NODE_ENV === 'development') console.log('decrypt:', { ...data })
    delete data.encryptedData
  }
  if (import.meta.env.VITE_USER_NODE_ENV === 'development') console.log('data:', { ...data })
  switch (code) {
    case 200:
      // 业务层级错误处理，以下是假定restful有一套统一输出格式(指不管成功与否都有相应的数据格式)情况下进行处理
      // 例如响应内容：
      // 错误内容：{ code: 1, msg: '非法参数' }
      // 正确内容：{ code: 200, data: {  }, msg: '操作正常' }
      // return data
      return data
    case 401:
      resetAll().then(() => {
        router.push({ path: '/login', replace: true }).then(() => {})
      })
      break
    case 402:
      // C-C4: 网关无真实 refreshToken 接口（原逻辑为死代码，会令并发请求永久 pending），
      // 令牌过期与 401 同等处理：清空会话并跳转登录
      resetAll().then(() => {
        router.push({ path: '/login', replace: true }).then(() => {})
      })
      break
    case 403:
      // return await setSiteConfig(config)
      // router.push({ path: '/403' }).then(() => {})
      break
  }
  // 异常处理
  // 若data.msg存在，覆盖默认提醒消息
  const errMsg = CODE_MESSAGE[statusCode] ? translate(CODE_MESSAGE[statusCode]) : data && data[messageName] ? data[messageName] : translate('未知错误！请联系管理员')
  // 是否显示高亮错误(与errorHandler钩子触发逻辑一致)
  gp.$baseMessage(errMsg, 'error', 'hey')
  if (needErrorLog()) addErrorLog({ message: errMsg, stack: data, isRequest: true })
  return Promise.reject(data)
}
/**
 * @description axios初始化
 *
 * 宿主说明（迁移后）：
 * - Tauri 桌面端：本地 HTTP 服务已随 Electron 一并移除，`baseURL` 仅作为代理路径前缀
 *   （等价老链路 `req.originalUrl` 中的 `/api`），请求经 `src/utils/tauriAdapter.ts`
 *   以 IPC 调用已注册命令 `proxy_request` 转发网关；
 * - 浏览器（`vite dev` 调试）：保留 axios 默认 adapter，行为与老 `web/` 构建一致。
 */
const instance = axios.create({
  baseURL: `${import.meta.env.VITE_APP_BASE_URL || '/api'}`,
  timeout,
  headers: {
    'Content-Type': contentType,
  },
})

// Tauri 宿主下切换到 IPC 转发 adapter；`baseURL` 前缀由 adapter 拼接进代理路径
if (isTauri()) instance.defaults.adapter = createTauriProxyAdapter()

/**
 * @description axios请求拦截器
 */
instance.interceptors.request.use(requestConf, (error) => {
  return Promise.reject(error)
})

/**
 * @description axios响应拦截器
 */
instance.interceptors.response.use(
  // 2xx 范围内的状态码都会触发该函数。
  (response) => handleData(response),
  // 超出 2xx 范围的状态码都会触发该函数。
  (error) => {
    const { response, config } = error
    // 网络错误时重试一次（仅在无响应时，即真正的网络问题）
    if (response === undefined && config.retryCount < 1) {
      config.retryCount++
      // 交由请求拦截器重新签名（App-Secret 时间戳/nonce 需重算）；
      // 拦截器以 config.plainData 还原原始 body，不会二次加密或重复序列化
      return instance(config)
    }
    if (response === undefined) {
      if (loadingInstance) loadingInstance.close()
      gp.$baseMessage(
        translate('连接后台接口失败，可能由以下原因造成：后端不支持跨域CORS、接口地址不存在、请求超时等，请联系管理员排查后端接口问题'),
        'error',
        'hey'
      )
      return {}
    } else return handleData(response)
  }
)

export default instance
