/**
 * @description axios 请求层：本地链路签名/加解密拦截器 + 统一响应处理
 *
 * [框架统一] books / console 同一份代码（改动需双侧同步）。
 *
 * 两条宿主链路（`src/utils/host.ts` 判定，切换只发生在下方 `instance.defaults.adapter` 一处）：
 * ```text
 * npm run tauri:dev / npm run build（桌面宿主，代理模型）
 *   渲染层 axios → Tauri adapter（src/utils/tauriAdapter.ts）→ invoke('proxy_request')
 *   → Rust proxy：用 TAURI_LINK_*（= 本端 VITE_APP_*）验签/解密 → 用 TAURI_APP_* 重签名重加密
 *   → 请求 TAURI_APP_BASE_URL（或本地 secrets 表 app_url）对应的网关 → 解密回包再用本地链路加密返回
 *
 * npm run dev（浏览器宿主，直连模型）
 *   渲染层 axios → vite /api 代理 → 测试网关：此时 VITE_APP_* 就是网关凭证，
 *   网关要求的 X-Sign 由本文件请求拦截器直接补齐
 * ```
 *
 * 密钥口径（详见 `.env.example`）：`VITE_APP_*` 在桌面宿主下是「本地链路对」，
 * 在浏览器直连下是「被调用网关凭证」；`TAURI_APP_*` 只存在于 Rust 侧，渲染层拿不到。
 *
 * 契约要点：
 * 1. `App-Secret = md5(sha256(appId + timeStamp + nonce) + appSecret) + timeStamp`，
 *    nonce 32 位字母数字（CSPRNG），服务端按 `TOKEN_TIME`（1800s）判过期防重放；
 * 2. 请求体加密为随机 IV 前置格式 `iv(hex):密文(hex)`（`VITE_REQUEST_ENCRYPT`），
 *    回包解密同样优先按该格式，兼容老网关的固定 IV 纯密文（`VITE_APP_IV` 兜底）；
 * 3. `X-Sign` 的签名对象是网关 `VerifySignature` 实际看到的 `{ ...req.query, ...req.body }`：
 *    query 走「真正上送的那段字符串」还原成键值表（值一律字符串，与 Express 5 默认查询解析器同口径），
 *    body 取冻结后的结构（加密场景为 `{ encryptedData }`），无参请求也要按 `{}` 出签；
 * 4. 网络错误重试一次会重入拦截器：以首次冻结的 `signedBody` 为准，避免二次加密与签名漂移。
 *
 * @Author: trexwb
 * @Date: 2026-10-12
 */
import { stringify } from 'qs'
import CryptoJS from 'crypto-js'
import { translate } from '/@/i18n'
import { contentType, debounce, messageName, statusName, successCode, timeout } from '/@/config'
import router from '/@/router'
import { useUserStore } from '/@/store/modules/user'
import { isArray } from '/@/utils/validate'
import { isTauri } from '/@/utils/host'
import { computeXSign, createTauriProxyAdapter, paramsToQuery, queryToSignFields } from '/@/utils/tauriAdapter'
import { addErrorLog, needErrorLog } from '/@vab/plugins/errorLog'
import { gp } from '/@vab/plugins/vab'

const md5 = (str: string): string => CryptoJS.MD5(str).toString()

// 与后端约定一致：请求签名摘要用 sha256（App-Secret / X-Sign 都基于它）
const sha256 = (str: string): string => CryptoJS.SHA256(str).toString()

// 加密函数：每次使用随机 IV，输出 `iv(hex) + ':' + 密文(hex)`（与网关 Crypto.encrypt、
// Rust 侧 crypt::encrypt_iv_prefixed 同格式；VITE_APP_IV 不再参与请求加密）
const encrypt = (encryptedData: any, key: string): string => {
  if (key.length !== 32) {
    throw new Error('Invalid key length')
  }
  const keyWordArray = CryptoJS.enc.Utf8.parse(key)
  const ivWordArray = CryptoJS.lib.WordArray.random(16)
  const encryptedText = JSON.stringify(encryptedData)
  const encrypted = CryptoJS.AES.encrypt(encryptedText, keyWordArray, { iv: ivWordArray }).ciphertext.toString(CryptoJS.enc.Hex)
  return `${ivWordArray.toString(CryptoJS.enc.Hex)}:${encrypted}`
}

// 解密函数：兼容两种回包格式
//   1) 新格式（网关 / Rust 代理）：随机 IV 前置 `iv(hex):密文(hex)`
//   2) 老格式（老网关、老 Electron 本地服务）：无 IV 前缀的纯密文 hex，使用 VITE_APP_IV
const decrypt = (encryptedText: string, key: string, iv: string): any => {
  if (key.length !== 32) {
    throw new Error('Invalid key length')
  }
  const keyWordArray = CryptoJS.enc.Utf8.parse(key)

  let ivWordArray: any
  let cipherHex: string
  const sepIndex = encryptedText.indexOf(':')
  if (sepIndex === 32) {
    ivWordArray = CryptoJS.enc.Hex.parse(encryptedText.slice(0, sepIndex))
    cipherHex = encryptedText.slice(sepIndex + 1)
    if (ivWordArray.sigBytes !== 16) {
      throw new Error(`Invalid iv length: ${ivWordArray.sigBytes} bytes`)
    }
  } else {
    if (iv.length !== 16) {
      throw new Error('Invalid iv length')
    }
    ivWordArray = CryptoJS.enc.Utf8.parse(iv)
    cipherHex = encryptedText
  }

  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Hex.parse(cipherHex),
  })
  const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWordArray, { iv: ivWordArray }).toString(CryptoJS.enc.Utf8)
  if (import.meta.env.VITE_USER_NODE_ENV === 'development') console.log('Decrypted string:', decrypted)
  try {
    return JSON.parse(decrypted)
  } catch {
    throw new Error('Invalid JSON format after decryption')
  }
}

// 防重放 nonce（32 位字母数字，供 App-Nonce 头与 App-Secret 计算使用）
// 必须使用密码学随机源：Math.random 可预测，会让防重放 nonce 失去意义
const NONCE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const generateNonce = (): string => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let result = ''
  for (let i = 0; i < bytes.length; i++) result += NONCE_ALPHABET.charAt(bytes[i] % NONCE_ALPHABET.length)
  return result
}

// P1-1：loading 实例集合——debounce 名单内请求重试时拦截器重入会再建实例，
// 单一引用被覆盖会令首个实例永不 close（永久 loading）；统一在响应后全部关闭
const loadingInstances: any[] = []
const closeLoadings = (): void => {
  while (loadingInstances.length) loadingInstances.pop()?.close()
}
// P1-3：401/402 并发防抖标志，避免多个请求同时失效时重复 resetAll + 跳转
let isResetting = false

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
  // 本地链路鉴权三元组：桌面宿主下由 Rust middleware.token 校验，
  // 浏览器直连下由网关 AuthenticateSecret 校验（算法同一条）
  config.headers['App-Id'] = `${import.meta.env.VITE_APP_ID}`
  config.headers['App-Nonce'] = nonce
  config.headers['App-Secret'] =
    md5(`${sha256(`${import.meta.env.VITE_APP_ID}${timeStamp}${nonce}`)}${import.meta.env.VITE_APP_SECRET}`) + timeStamp

  // 规范写法 不可随意自定义
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
    // config.headers['Auth-Token'] = `${token}`
  }

  const isForm = Boolean(config.data) && config.headers['Content-Type'] === 'application/x-www-form-urlencoded;charset=UTF-8'
  // 首次进入拦截器时冻结「网关 verifySignature 实际看到的 body 结构」：
  // 加密场景为 { encryptedData }，表单场景为序列化前的键值对象。
  // 重试时复用该结构，既避免对已加密 body 的二次加密，也避免签名漂移。
  if (config.signedBody === undefined) {
    const plainBody = config.data
    if (import.meta.env.VITE_REQUEST_ENCRYPT === 'true' && config.data) {
      config.data = {
        encryptedData: encrypt(config.data, import.meta.env.VITE_APP_SECRET),
      }
    }
    config.signedBody = isForm ? plainBody : (config.data ?? {})
  }
  if (isForm && typeof config.data !== 'string') config.data = stringify(config.data)

  // X-Sign：网关 VERIFY_SIGNATURE=true 时所有 /api/** 请求（含 GET、含浏览器直连）都必须带签。
  // 桌面宿主下 Rust 会用网关凭证重算覆盖本头，这里保留仅为口径统一、便于直连调试。
  const signFields = { ...queryToSignFields(paramsToQuery(config.params)), ...config.signedBody }
  config.headers['X-Sign'] = computeXSign(signFields, import.meta.env.VITE_APP_SECRET)

  if (debounce.some((item: string) => config.url.includes(item))) loadingInstances.push(gp.$baseLoading())

  return config
}

/**
 * axios响应拦截器
 * @param config {any} 请求配置
 * @param data {any} response数据
 * @param status {any} HTTP status
 * @param statusText {any} status text
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
  closeLoadings()
  // P2-6：data 可能为空（204 / 空响应体），统一安全取值，避免解构炸出误导性 TypeError
  const bodyCode = data && data[statusName] ? data[statusName] : null
  const statusCode = bodyCode !== null ? bodyCode : status
  let code = bodyCode !== null ? Number((bodyCode || 200).toString().substring(0, 3)) : status
  // 若code属于操作正常code，则status修改为200
  if (bodyCode !== null && codeVerificationArray.indexOf(bodyCode) + 1) code = 200
  if (import.meta.env.VITE_USER_NODE_ENV === 'development') console.log('data:', data)
  if (import.meta.env.VITE_RETURN_ENCRYPT === 'true' && data?.encryptedData) {
    // 有加密返回时解密
    data.data = await decrypt(data.encryptedData, import.meta.env.VITE_APP_SECRET, import.meta.env.VITE_APP_IV)
    delete data.encryptedData
    if (import.meta.env.VITE_USER_NODE_ENV === 'development') console.log('decrypt:', { ...data })
  }
  switch (code) {
    case 200:
      // 业务层级错误处理，以下是假定restful有一套统一输出格式(指不管成功与否都有相应的数据格式)情况下进行处理
      // 例如响应内容：
      // 错误内容：{ code: 1, msg: '非法参数' }
      // 正确内容：{ code: 200, data: {  }, msg: '操作正常' }
      return data
    case 401:
    case 402:
      // 网关无真实 refreshToken 接口（令牌过期会令并发请求永久 pending），
      // 失效/过期统一登出；并发只触发一次跳转，并统一 reject（与下方异常分支同语义）
      if (!isResetting) {
        isResetting = true
        resetAll().finally(() => {
          isResetting = false
          router.push({ path: '/login', replace: true }).then(() => {})
        })
      }
      return Promise.reject(data || { [statusName]: code, [messageName]: '登录已过期' })
    case 403:
      // return await setSiteConfig(config)
      // router.push({ path: '/403' }).then(() => {})
      break
  }
  // 异常处理
  // 若data.msg存在，覆盖默认提醒消息
  const fallback = data && data[messageName] ? data[messageName] : '未知错误！请联系管理员'
  const errMsg = CODE_MESSAGE[statusCode] ? translate(CODE_MESSAGE[statusCode]) : translate(fallback)
  // 是否显示高亮错误(与errorHandler钩子触发逻辑一致)
  gp.$baseMessage(errMsg, 'error', 'hey')
  if (needErrorLog()) addErrorLog({ message: errMsg, stack: data, isRequest: true })
  return Promise.reject(data)
}

/**
 * @description axios初始化
 *
 * 宿主说明：
 * - Tauri 桌面端：不启动本地 HTTP 服务，`baseURL` 只作为代理路径前缀（等价老链路
 *   `req.originalUrl` 中的 `/api`），请求经 adapter 以 IPC 调用 `proxy_request` 转发网关；
 * - 浏览器（`npm run dev`）：保留 axios 默认 adapter，直连 vite 代理后的测试网关。
 */
const instance = axios.create({
  baseURL: `${import.meta.env.VITE_APP_BASE_URL || '/api'}`,
  timeout,
  headers: {
    'Content-Type': contentType,
  },
  // 固定查询串序列化：让「上送的 query」与「参与 X-Sign / Rust 重签名的 query」严格同源
  paramsSerializer: paramsToQuery,
})

// Tauri 宿主唯一切换点：拦截器（签名、加密、handleData）两条链路共用，adapter 只负责出网方式
if (isTauri()) instance.defaults.adapter = createTauriProxyAdapter()

/**
 * 统一请求入口：保留可调用形态（default export 可挂拦截器），调用方无感。
 * 响应拦截器已把结果拆成业务信封，因此这里声明为 Promise<any> 而不是 AxiosResponse。
 */
const request = (config: any): Promise<any> => instance(config)

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
    if (response === undefined && config?.retryCount < 1) {
      config.retryCount++
      // 只交给实例重跑一次拦截器（App-Secret 时间戳/nonce 需重算）：
      // 拦截器以冻结的 signedBody 为准，不会二次加密或重复序列化
      return instance(config)
    }
    if (response === undefined) {
      closeLoadings()
      gp.$baseMessage(
        translate(
          '连接后台接口失败，可能由以下原因造成：后端不支持跨域CORS、接口地址不存在、请求超时等，请联系管理员排查后端接口问题'
        ),
        'error',
        'hey'
      )
      // P2-6：保持 reject 语义（原 return {} 吞错会让调用方解构 data 时炸出误导性 TypeError）
      return Promise.reject(new Error('Network unreachable'))
    }
    return handleData(response)
  }
)

export default request
