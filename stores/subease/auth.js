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

      if (!force && this.accessToken) {
        if (!this.userInfo) {
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
          this.clearAuth()
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
