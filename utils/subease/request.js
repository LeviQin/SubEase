import { useSubeaseAuthStore } from '../../stores/subease/auth'
import { API_BASE_URL } from './config'

const API_BASE_URL_STORAGE_KEY = 'subease-api-base-url'
const DEFAULT_LOCAL_API_BASE_URL = API_BASE_URL.LOCAL
const DEFAULT_MP_WEIXIN_API_BASE_URL = API_BASE_URL.MP_WEIXIN
// 默认请求超时：15s（慢网场景避免长时间无响应）
const DEFAULT_TIMEOUT = 15000

// 将网络层失败（无 HTTP 响应）转为友好提示
function toFriendlyError(error, fallback = '网络异常，请稍后重试') {
  if (!error) return new Error(fallback)
  const raw = String(error.errMsg || error.message || '')
  if (/timeout/i.test(raw)) return new Error('请求超时，请检查网络后重试')
  if (error.response) return error
  return error instanceof Error ? error : new Error(fallback)
}

function normalizeApiBaseUrl(url = '') {
  const trimmed = String(url || '').trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`
}

function isWechatDevtools() {
  // #ifdef MP-WEIXIN
  try {
    const systemInfo = uni.getSystemInfoSync()
    return systemInfo.platform === 'devtools'
  } catch (error) {
    console.error('[SubeaseRequest] 读取运行环境失败', error)
  }
  // #endif
  return false
}

export function getApiBaseUrl() {
  try {
    const customBaseUrl = uni.getStorageSync(API_BASE_URL_STORAGE_KEY)
    if (customBaseUrl) {
      // #ifdef MP-WEIXIN
      if (!isWechatDevtools()) {
        try {
          uni.removeStorageSync(API_BASE_URL_STORAGE_KEY)
        } catch {}
        return DEFAULT_MP_WEIXIN_API_BASE_URL
      }
      // #endif
      const normalized = normalizeApiBaseUrl(customBaseUrl)
      if (normalized !== customBaseUrl) {
        uni.setStorageSync(API_BASE_URL_STORAGE_KEY, normalized)
      }
      return normalized
    }
  } catch (error) {
    console.error('[SubeaseRequest] 读取自定义 API 地址失败', error)
  }

  // #ifdef MP-WEIXIN
  if (isWechatDevtools()) return DEFAULT_LOCAL_API_BASE_URL
  return DEFAULT_MP_WEIXIN_API_BASE_URL
  // #endif

  // #ifndef MP-WEIXIN
  return DEFAULT_LOCAL_API_BASE_URL
  // #endif
}

function buildUrl(url = '') {
  const apiBaseUrl = getApiBaseUrl()
  if (!url) return apiBaseUrl
  if (/^https?:\/\//.test(url)) return url
  return `${apiBaseUrl}${url.startsWith('/') ? url : `/${url}`}`
}

function withAuthorization(options = {}) {
  const authStore = useSubeaseAuthStore()
  const headers = { ...(options.header || {}) }

  if (!options.custom || !options.custom.skipAuth) {
    const token = authStore.accessToken || ''
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  return {
    ...options,
    url: buildUrl(options.url),
    header: headers
  }
}

let requestInterceptorInstalled = false
let uploadInterceptorInstalled = false

export function installRequestInterceptor() {
  if (!requestInterceptorInstalled) {
    uni.addInterceptor('request', {
      invoke(options) {
        const nextOptions = withAuthorization(options)
        Object.assign(options, nextOptions)
      }
    })
    requestInterceptorInstalled = true
  }

  if (!uploadInterceptorInstalled) {
    uni.addInterceptor('uploadFile', {
      invoke(options) {
        const nextOptions = withAuthorization(options)
        Object.assign(options, nextOptions)
      }
    })
    uploadInterceptorInstalled = true
  }
}

function isUnauthorizedResponse(response) {
  return response.statusCode === 401 || (response.data && response.data.code === 401)
}

function parseResponse(response) {
  const body = response.data || {}
  if (response.statusCode >= 200 && response.statusCode < 300 && body.code === 200) {
    return body.data
  }
  const message = body.message || `请求失败(${response.statusCode || 'unknown'})`
  const error = new Error(message)
  error.response = response
  throw error
}

async function redirectToAuthPage() {
  try {
    const authStore = useSubeaseAuthStore()
    authStore.markSessionExpired()
  } catch {}
  const pages = getCurrentPages ? getCurrentPages() : []
  const currentRoute = pages.length ? `/${pages[pages.length - 1].route}` : ''
  if (currentRoute === '/pages/index/index') return
  uni.reLaunch({ url: '/pages/index/index' })
}

async function executeRequest(options) {
  return new Promise((resolve, reject) => {
    uni.request({
      ...options,
      timeout: options.timeout || DEFAULT_TIMEOUT,
      success: resolve,
      fail: (error) => reject(toFriendlyError(error))
    })
  })
}

async function executeUpload(options) {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      ...options,
      timeout: options.timeout || DEFAULT_TIMEOUT,
      success: (res) => {
        try {
          const data =
            typeof res.data === 'string' ? JSON.parse(res.data || '{}') : (res.data || {})
          resolve({
            statusCode: res.statusCode,
            data
          })
        } catch (error) {
          const parseError = new Error('上传响应格式异常，请稍后重试')
          parseError.response = { statusCode: res.statusCode, data: res.data }
          reject(parseError)
        }
      },
      fail: (error) => reject(toFriendlyError(error))
    })
  })
}

// 登录态恢复链路（一次完成，避免二次 refresh 死锁）：
// 1) 尝试 refresh accessToken 后重试；
// 2) refresh 失败（token 已失效 / 网络异常）时降级 wx.login 静默登录后重试；
// 3) 静默登录也失败才标记会话失效并引导手动登录。
async function recoverSession(options, executor) {
  if (options.custom && options.custom.skipRefresh) {
    throw new Error('当前请求禁止自动刷新 Token')
  }

  const authStore = useSubeaseAuthStore()
  const buildRetriedOptions = () => ({
    ...options,
    custom: {
      ...(options.custom || {}),
      retried: true
    }
  })

  // ① 先尝试 refresh
  try {
    await authStore.refreshAccessToken()
    const response = await executor(buildRetriedOptions())
    return parseResponse(response)
  } catch (refreshError) {
    console.warn('[SubeaseRequest] accessToken 刷新失败，尝试静默登录恢复', refreshError.message)
  }

  // ② 降级静默登录（wx.login 重新换取 token）
  try {
    await authStore.wxSilentLogin(true)
    if (!authStore.accessToken) {
      throw new Error('登录态恢复失败，请重新登录')
    }
    const response = await executor(buildRetriedOptions())
    return parseResponse(response)
  } catch (loginError) {
    // ③ 静默登录也失败：标记会话失效，引导手动登录
    try {
      authStore.markSessionExpired()
      if (!authStore.isLoggedIn) {
        await redirectToAuthPage()
      }
    } catch {}
    throw loginError
  }
}

export async function request(options = {}) {
  try {
    const response = await executeRequest(options)
    if (
      isUnauthorizedResponse(response) &&
      !(options.custom && options.custom.retried) &&
      !(options.custom && options.custom.skipRefresh)
    ) {
      return await recoverSession(options, executeRequest)
    }
    return parseResponse(response)
  } catch (error) {
    if (
      error.response &&
      isUnauthorizedResponse(error.response) &&
      !(options.custom && options.custom.skipRefresh)
    ) {
      return await recoverSession(options, executeRequest)
    }
    throw error
  }
}

export async function uploadFile(options = {}) {
  try {
    const response = await executeUpload(options)
    if (
      isUnauthorizedResponse(response) &&
      !(options.custom && options.custom.retried) &&
      !(options.custom && options.custom.skipRefresh)
    ) {
      return await recoverSession(options, executeUpload)
    }
    return parseResponse(response)
  } catch (error) {
    if (
      error.response &&
      isUnauthorizedResponse(error.response) &&
      !(options.custom && options.custom.skipRefresh)
    ) {
      return await recoverSession(options, executeUpload)
    }
    throw error
  }
}
