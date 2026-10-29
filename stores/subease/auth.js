import { defineStore } from 'pinia'
import { getCurrentUser, wxLogin, refreshAccessToken } from '../../api/subease/auth'

const AUTH_STORAGE_KEY = 'subease-auth'
const MANUAL_LOGOUT_STORAGE_KEY = 'subease-manual-logout'

function isUnauthorized(error) {
  const response = error && error.response
  const statusCode = response && response.statusCode
  const code = response && response.data && response.data.code
  return statusCode === 401 || code === 401
}

// ── JWT 本地解析（仅用于预检 accessToken 是否过期）──
// 不依赖 atob，兼容微信小程序各 JS 引擎（JSCore / V8）
const B64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64UrlDecode(str) {
  const b64 = String(str).replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4
  const normalized = pad ? b64 + '==='.slice(0, 4 - pad) : b64
  const bytes = []
  let buffer = 0
  let bits = 0
  for (let i = 0; i < normalized.length; i++) {
    const code = B64_CHARS.indexOf(normalized[i])
    if (code < 0) continue
    buffer = (buffer << 6) | code
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  let text = ''
  for (let i = 0; i < bytes.length; i++) {
    text += String.fromCharCode(bytes[i])
  }
  try {
    text = decodeURIComponent(escape(text))
  } catch (error) {
    // 非 UTF-8 内容时保持原始文本
  }
  return text
}

function parseJwtPayload(token) {
  try {
    const parts = String(token || '').split('.')
    if (parts.length !== 3) return null
    return JSON.parse(base64UrlDecode(parts[1]))
  } catch (error) {
    return null
  }
}

// accessToken 是否已过期（无法解析时返回 false，交由后端 401 判定）
function isAccessTokenExpired(token, skewSeconds = 60) {
  const payload = parseJwtPayload(token)
  if (!payload || !payload.exp) return false
  return payload.exp * 1000 - skewSeconds * 1000 <= Date.now()
}

function loadPersistedState() {
  try {
    const raw = uni.getStorageSync(AUTH_STORAGE_KEY)
    if (!raw) return null
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch (error) {
    console.error('[SubeaseAuthStore] 读取本地登录态失败', error)
    return null
  }
}

function savePersistedState(payload) {
  try {
    uni.setStorageSync(AUTH_STORAGE_KEY, payload)
  } catch (error) {
    console.error('[SubeaseAuthStore] 持久化登录态失败', error)
  }
}

function clearPersistedState() {
  try {
    uni.removeStorageSync(AUTH_STORAGE_KEY)
  } catch (error) {
    console.error('[SubeaseAuthStore] 清理登录态失败', error)
  }
}

function loadManualLogoutState() {
  try {
    return Boolean(uni.getStorageSync(MANUAL_LOGOUT_STORAGE_KEY))
  } catch (error) {
    console.error('[SubeaseAuthStore] 读取手动退出状态失败', error)
    return false
  }
}

function saveManualLogoutState() {
  try {
    uni.setStorageSync(MANUAL_LOGOUT_STORAGE_KEY, 1)
  } catch (error) {
    console.error('[SubeaseAuthStore] 持久化手动退出状态失败', error)
  }
}

function clearManualLogoutState() {
  try {
    uni.removeStorageSync(MANUAL_LOGOUT_STORAGE_KEY)
  } catch (error) {
    console.error('[SubeaseAuthStore] 清理手动退出状态失败', error)
  }
}

export function getWeixinLoginCode() {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    wx.login({
      success: (res) => {
        if (res.code) {
          resolve(res.code)
          return
        }
        reject(new Error('微信登录 code 获取失败'))
      },
      fail: reject
    })
    // #endif

    // #ifndef MP-WEIXIN
    uni.login({
      provider: 'weixin',
      success: (res) => {
        if (res.code) {
          resolve(res.code)
          return
        }
        reject(new Error('uni.login 未返回 code'))
      },
      fail: reject
    })
    // #endif
  })
}

let silentLoginPromise = null
let refreshPromise = null

export const useSubeaseAuthStore = defineStore('subeaseAuth', {
  state: () => ({
    accessToken: '',
    refreshToken: '',
    userInfo: null,
    authReady: false,
    silentLoginLoading: false,
    manualLogout: false,
    sessionExpired: false,
    hadLoginSession: false
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.accessToken),
    nickname: (state) => {
      return (state.userInfo && state.userInfo.nickname) || '归期本用户'
    },
    avatarUrl: (state) => {
      return (state.userInfo && state.userInfo.avatar_url) || ''
    },
    avatarText: (state) => {
      const nick = (state.userInfo && state.userInfo.nickname) || ''
      if (!nick || nick === '归期本用户') return 'USER'
      return nick.slice(0, 2).toUpperCase()
    },
    userIdText: (state) => {
      const uid = state.userInfo && state.userInfo.uid
      if (!uid) return ''
      return `ID: ${String(uid)}`
    }
  },
  actions: {
    hydrate() {
      const cached = loadPersistedState()
      this.manualLogout = loadManualLogoutState()
      if (!cached) return
      this.accessToken = cached.accessToken || ''
      this.refreshToken = cached.refreshToken || ''
      this.userInfo = cached.userInfo || null
      this.hadLoginSession = Boolean(cached.accessToken)
    },
    persist() {
      savePersistedState({
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        userInfo: this.userInfo
      })
    },
    setAuth(payload) {
      this.accessToken = payload.accessToken || ''
      this.refreshToken = payload.refreshToken || this.refreshToken
      this.userInfo = payload.userInfo || this.userInfo
      this.manualLogout = false
      this.sessionExpired = false
      this.hadLoginSession = true
      clearManualLogoutState()
      this.persist()
    },
    setUserInfo(userInfo) {
      this.userInfo = userInfo || null
      this.persist()
    },
    async fetchCurrentUser() {
      if (!this.accessToken) {
        throw new Error('缺少 accessToken')
      }
      const data = await getCurrentUser()
      this.setUserInfo(data.userInfo || null)
      return this.userInfo
    },
    clearAuth(options = {}) {
      const { manual = false } = options
      this.accessToken = ''
      this.refreshToken = ''
      this.userInfo = null
      this.manualLogout = manual
      this.sessionExpired = !manual
      if (manual) {
        this.hadLoginSession = false
      }
      if (manual) {
        saveManualLogoutState()
      } else {
        clearManualLogoutState()
      }
      clearPersistedState()
    },
    markSessionExpired() {
      this.sessionExpired = true
    },
    clearSessionExpired() {
      this.sessionExpired = false
    },
    async wxSilentLogin(force = false) {
      if (silentLoginPromise) {
        return silentLoginPromise
      }

      if (this.manualLogout && !force) {
        this.authReady = true
        return null
      }

      // 已有本地登录态：预检 accessToken 是否过期，过期则先走刷新链路，
      // 避免带着过期 token 进入页面后连环 401（表现为「token 拉取失败」）
      if (!force && this.accessToken) {
        const tokenExpired = isAccessTokenExpired(this.accessToken)
        if (!tokenExpired) {
          const needsUserRefresh =
            !this.userInfo ||
            this.userInfo.defaultRemindDays == null ||
            this.userInfo.subscribeRemain == null ||
            this.userInfo.monthlyBudgetCny == null
          if (needsUserRefresh) {
            try {
              await this.fetchCurrentUser()
            } catch (error) {
              console.error('[SubeaseAuthStore] 拉取当前用户资料失败', error)
              this.authReady = true
              if (isUnauthorized(error)) {
                this.clearAuth()
              }
              return null
            }
          }
          this.authReady = true
          return this.userInfo
        }

        // accessToken 已过期：先尝试 refresh；refresh 失败（token 被轮换/失效）时
        // 降级走 wx.login 静默登录，用户无感恢复，而不是要求「退出重登」
        try {
          await this.refreshAccessToken()
          this.authReady = true
          return this.userInfo
        } catch (error) {
          console.warn(
            '[SubeaseAuthStore] accessToken 已过期且刷新失败，尝试静默登录恢复',
            error.message
          )
          if (!isUnauthorized(error)) {
            // 网络/服务端瞬时错误：保留现有 token，由后续请求的重试链路自愈
            this.authReady = true
            return this.userInfo
          }
          // refreshToken 已失效（refreshAccessToken 内部已 clearAuth），继续走静默登录
        }
      }

      silentLoginPromise = (async () => {
        this.silentLoginLoading = true
        try {
          const code = await getWeixinLoginCode()
          console.info('[SubeaseAuthStore] 开始执行微信登录')
          const data = await wxLogin(code)
          this.setAuth({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            userInfo: data.userInfo
          })
          this.authReady = true
          return data.userInfo
        } catch (error) {
          console.error('[SubeaseAuthStore] 微信登录失败', error)
          // 静默登录失败时，若本地仍持有 token 则不强行清空，
          // 避免把可能可用的登录态误删、迫使后续手动重登
          if (!this.accessToken) {
            this.clearAuth()
          }
          this.authReady = true
          throw error
        } finally {
          this.silentLoginLoading = false
          silentLoginPromise = null
        }
      })()

      return silentLoginPromise
    },
    async refreshAccessToken() {
      if (!this.refreshToken) {
        throw new Error('缺少 refreshToken')
      }

      if (refreshPromise) {
        return refreshPromise
      }

      refreshPromise = (async () => {
        try {
          const data = await refreshAccessToken(this.refreshToken)
          this.setAuth({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken || this.refreshToken,
            userInfo: data.userInfo || this.userInfo
          })
          return this.accessToken
        } catch (error) {
          console.error('[SubeaseAuthStore] 刷新 accessToken 失败', error)
          if (isUnauthorized(error)) {
            this.clearAuth()
          }
          throw error
        } finally {
          refreshPromise = null
        }
      })()

      return refreshPromise
    }
  }
})
