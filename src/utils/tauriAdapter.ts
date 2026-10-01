/**
 * @description Tauri IPC 适配器：把 axios 请求改经 IPC 转发（等价老项目本地 Express 服务）
 *
 * 老链路（`client/console/web` + `electron`）：
 * ```text
 * 渲染层 axios（baseURL='/api'）→ https://localhost.edtib.com:64580/api/*（自签证书）
 *   → local Express：middleware.token 校验 App-Id/App-Nonce/App-Secret
 *   → controller/request.ts：读 configs/secrets → 解 body → 重加密 → x-sign → 转发 gateway → 解密响应
 *   → 返回 { code, message, timestamp, encryptedData|data } 信封
 * ```
 *
 * 新链路（本适配器）：渲染层 axios → `invoke('proxy_request')` → Rust `commands::proxy::proxy_request`
 * （同样五步，`src-tauri/src/proxy/`）→ reqwest 转发 gateway。无本地端口、无自签证书、无 Node HTTP 服务。
 *
 * 行为对齐要点（保持 `src/api/*.ts` 调用签名与拦截器零改动）：
 * 1. 请求/响应拦截器仍由 axios 执行：App-Id/App-Nonce/App-Secret、body 加密（`VITE_REQUEST_ENCRYPT`）、
 *    响应解密（`VITE_RETURN_ENCRYPT`）、token 注入与 `auth-token` 回写均不变；
 * 2. 命令返回 `{ status, headers, body }`，其中 `body` 即老 Express 的响应信封、
 *    `headers` 即网关响应头（`res.set(response.headers)` 的等价物，供前端读取 `auth-token`）；
 * 3. 路径口径：老链路本地服务的 `req.originalUrl` 含 `/api` 前缀（`baseURL + url`），
 *    由 Rust 侧与 `secrets.app_url` 的 origin 拼接为最终网关地址，因此这里同样拼接 `baseURL` 前缀；
 * 4. body 口径：axios 的 `transformRequest` 已把对象序列化成字符串（等价 HTTP 上送），
 *    这里再按 `Content-Type` 还原为对象（等价 Express 的 `express.json()` / `express.urlencoded()` 解析结果）；
 * 5. 超时/错误口径：超时抛 `ECONNABORTED`、命令失败抛 `ERR_NETWORK`（均无 `response`，
 *    交给 `request.ts` 既有的「网络错误重试一次」分支）；非 2xx 抛带 `response` 的 `AxiosError`，
 *    由响应拦截器统一走 `handleData`。
 *
 * @Author: trexwb
 * @Date: 2026-09-29
 */

import { AxiosError } from 'axios'
import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios'
import { invoke } from '@tauri-apps/api/core'
import { stringify } from 'qs'

/** 已注册的 Rust 转发命令（`lib.rs` 的 `generate_handler!`） */
export const PROXY_COMMAND = 'proxy_request'

/** 命令返回信封（等价 `src-tauri/src/proxy/mod.rs` 的 `ProxyResponse`，serde camelCase） */
export interface ProxyResponsePayload {
  status: number
  headers: Record<string, string>
  body: unknown
}

/** 命令入参（等价 `ProxyRequest`，serde camelCase） */
interface ProxyCommandRequest {
  path: string
  method: string
  headers: Record<string, string>
  params?: unknown
  body?: unknown
  timeout: number
}

/**
 * 不向网关透传的请求头：由浏览器/axios/reqwest 自行生成，
 * 老链路里 Express 也会重写这些头（content-length 必须按最终 body 重算）。
 */
const DROPPED_HEADERS = new Set([
  'content-length',
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'accept-encoding',
  'user-agent',
  'origin',
  'referer',
  'sec-fetch-mode',
  'sec-fetch-site',
  'sec-fetch-dest',
  'accept-language',
])

const DEFAULT_TIMEOUT_MS = 30000

/** 归一化 axios headers（`AxiosHeaders` 实例 / 普通对象）为小写键的纯对象 */
const normalizeHeaders = (headers: unknown): Record<string, string> => {
  const raw: Record<string, any> = {}
  if (!headers) return raw
  const source = headers as any
  if (typeof source.toJSON === 'function') {
    Object.assign(raw, source.toJSON())
  } else if (typeof source.forEach === 'function') {
    source.forEach((value: any, key: string) => {
      raw[String(key).toLowerCase()] = value
    })
  } else {
    Object.assign(raw, source)
  }

  const result: Record<string, string> = {}
  Object.keys(raw).forEach((key) => {
    const value = raw[key]
    if (value === undefined || value === null) return
    const lower = key.toLowerCase()
    if (DROPPED_HEADERS.has(lower)) return
    result[lower] = String(value)
  })
  return result
}

/** 解析出代理路径：等价老链路 `req.originalUrl`（含 `/api` 前缀与 query） */
const resolvePath = (config: AxiosRequestConfig): string => {
  const url = config.url || ''
  const baseURL = config.baseURL || ''
  let target = url

  // 相对路径拼接 baseURL（`/api` + `/console/xxx`）；绝对地址则只取 path + search
  if (!/^https?:\/\//i.test(url) && baseURL) target = `${baseURL}${url}`
  if (/^https?:\/\//i.test(target)) {
    try {
      const parsed = new URL(target)
      target = `${parsed.pathname}${parsed.search}`
    } catch {
      /* 非法 URL：保持原样交由 Rust 侧报错 */
    }
  }
  if (!target.startsWith('/')) target = `/${target}`

  // axios 的 `params` 由 adapter 负责拼进 URL（老链路里由浏览器拼好后作为 query 到达本地服务）
  const query = paramsToQuery(config.params)
  if (query) target += (target.includes('?') ? '&' : '?') + query

  return target
}

/** `config.params` → query string（`qs` 序列化，与老项目 `stringify` 口径一致） */
const paramsToQuery = (params: unknown): string => {
  if (!params) return ''
  if (typeof params === 'string') return params
  try {
    return stringify(params as Record<string, any>)
  } catch {
    return ''
  }
}

/**
 * body 还原：等价 Express 的 body 解析结果。
 * axios 的 `transformRequest` 已把对象 JSON.stringify（application/json）或 stringify（urlencoded），
 * 老链路里 Express 会再解析成对象传给 `controller/request.ts`，这里做同样的还原。
 */
const normalizeBody = (config: AxiosRequestConfig): unknown => {
  const data = (config as any).data
  if (data === undefined || data === null) return undefined

  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    throw new Error('multipart/form-data 上传未迁移：请改用 HTTP 直传或暂缓该接口')
  }
  if (typeof data === 'string') {
    const contentType = String(
      (config.headers as any)?.['content-type'] ?? (config.headers as any)?.['Content-Type'] ?? ''
    ).toLowerCase()
    if (contentType.includes('json')) {
      try {
        return JSON.parse(data)
      } catch {
        return data
      }
    }
    if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        // 等价 `express.urlencoded` 解析后再由 axios 以 JSON 转发
        return parseUrlEncoded(data)
      } catch {
        return data
      }
    }
    return data
  }
  return data
}

/** urlencoded 字符串 → 对象（等价 `express.urlencoded`） */
const parseUrlEncoded = (text: string): Record<string, unknown> => {
  const result: Record<string, unknown> = {}
  new URLSearchParams(text).forEach((value, key) => {
    result[key] = value
  })
  return result
}

/** 附加超时（axios 仅在自带 adapter 内实现 timeout，自定义 adapter 需自行兑现） */
const withTimeout = <T>(task: Promise<T>, timeout: number, config: AxiosRequestConfig): Promise<T> => {
  if (!timeout || timeout <= 0) return task
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AxiosError(`timeout of ${timeout}ms exceeded`, AxiosError.ECONNABORTED, config as any))
    }, timeout)
    task.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

/** 构造 Tauri 代理适配器（仅在 Tauri 宿主下挂载，浏览器环境保留 axios 默认 adapter） */
export const createTauriProxyAdapter = (): AxiosAdapter => {
  return async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    const timeout = Number(config.timeout) > 0 ? Number(config.timeout) : DEFAULT_TIMEOUT_MS
    const request: ProxyCommandRequest = {
      path: resolvePath(config),
      method: String(config.method || 'get').toUpperCase(),
      headers: normalizeHeaders(config.headers),
      params: config.params && typeof config.params === 'object' ? config.params : undefined,
      body: normalizeBody(config),
      timeout,
    }

    let payload: ProxyResponsePayload
    try {
      payload = await withTimeout(
        invoke<ProxyResponsePayload>(PROXY_COMMAND, { request }),
        timeout,
        config
      )
    } catch (error: any) {
      if (error instanceof AxiosError) throw error
      const message = error instanceof Error ? error.message : String(error)
      // 命令调用失败（IPC/转发异常）：等价老链路的「无响应」网络错误
      throw new AxiosError(`[${PROXY_COMMAND}] ${message}`, AxiosError.ERR_NETWORK, config as any, {
        __tauriProxy: true,
        command: PROXY_COMMAND,
      })
    }

    const status = Number(payload?.status) || 500
    const response: AxiosResponse = {
      data: payload?.body,
      status,
      statusText: String(status),
      // 键名统一小写：等价老链路「Node 侧 header 全部小写」的可见口径（前端按 `headers['auth-token']` 读取）
      headers: normalizeHeaders(payload?.headers) as any,
      config: config as any,
      request: { __tauriProxy: true, command: PROXY_COMMAND },
    }

    if (status >= 200 && status < 300) return response
    throw new AxiosError(
      `Request failed with status code ${status}`,
      String(status),
      config as any,
      response.request,
      response
    )
  }
}

export default createTauriProxyAdapter
