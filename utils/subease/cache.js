// 本地缓存：订阅列表（弱网/离线可用）+ 汇率（24h 有效）
// 订阅数据为低频变更数据，缓存策略：先渲染缓存 → 后台刷新 → 失败回退缓存
import { MAX_CUSTOM_CATEGORIES } from './constants'

const SUBSCRIPTIONS_CACHE_KEY = 'subease-subscriptions-cache'
const PAYMENT_RECORDS_CACHE_KEY = 'subease-payment-records-cache'
const MONTHLY_BUDGETS_CACHE_KEY = 'subease-monthly-budgets-cache'
const RATES_CACHE_KEY = 'subease-rates-cache'
const CUSTOM_CATEGORIES_KEY = 'subease-custom-categories'
const AMOUNTS_HIDDEN_KEY = 'subease-amounts-hidden'
const AUTH_STORAGE_KEY = 'subease-auth'
const RATES_MAX_AGE = 24 * 60 * 60 * 1000

function safeParse(raw) {
  if (!raw) return null
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return null
  }
}

export function loadSubscriptionsCache() {
  const data = safeParse(uni.getStorageSync(SUBSCRIPTIONS_CACHE_KEY))
  if (!data || !Array.isArray(data.list)) return null
  const auth = safeParse(uni.getStorageSync(AUTH_STORAGE_KEY))
  const currentUserId = Number(auth?.userInfo?.id || 0)
  if (!currentUserId || Number(data.userId || 0) !== currentUserId) return null
  return data.list
}

export function saveSubscriptionsCache(list) {
  try {
    const auth = safeParse(uni.getStorageSync(AUTH_STORAGE_KEY))
    const userId = Number(auth?.userInfo?.id || 0)
    if (!userId) return
    uni.setStorageSync(SUBSCRIPTIONS_CACHE_KEY, { userId, list, savedAt: Date.now() })
  } catch {
    // 存储满等场景静默失败
  }
}

export function clearSubscriptionsCache() {
  try {
    uni.removeStorageSync(SUBSCRIPTIONS_CACHE_KEY)
  } catch {
    // ignore
  }
}

export function loadPaymentRecordsCache() {
  const data = safeParse(uni.getStorageSync(PAYMENT_RECORDS_CACHE_KEY))
  if (!data || !Array.isArray(data.list)) return null
  const auth = safeParse(uni.getStorageSync(AUTH_STORAGE_KEY))
  const currentUserId = Number(auth?.userInfo?.id || 0)
  if (!currentUserId || Number(data.userId || 0) !== currentUserId) return null
  return data.list
}

export function savePaymentRecordsCache(list) {
  try {
    const auth = safeParse(uni.getStorageSync(AUTH_STORAGE_KEY))
    const userId = Number(auth?.userInfo?.id || 0)
    if (!userId) return
    uni.setStorageSync(PAYMENT_RECORDS_CACHE_KEY, { userId, list, savedAt: Date.now() })
  } catch {
    // 存储满等场景静默失败
  }
}

export function clearPaymentRecordsCache() {
  try {
    uni.removeStorageSync(PAYMENT_RECORDS_CACHE_KEY)
  } catch {
    // ignore
  }
}

export function loadMonthlyBudgetsCache() {
  const data = safeParse(uni.getStorageSync(MONTHLY_BUDGETS_CACHE_KEY))
  if (!data || !Array.isArray(data.list)) return null
  const auth = safeParse(uni.getStorageSync(AUTH_STORAGE_KEY))
  const currentUserId = Number(auth?.userInfo?.id || 0)
  if (!currentUserId || Number(data.userId || 0) !== currentUserId) return null
  return data.list
}

export function saveMonthlyBudgetsCache(list) {
  try {
    const auth = safeParse(uni.getStorageSync(AUTH_STORAGE_KEY))
    const userId = Number(auth?.userInfo?.id || 0)
    if (!userId) return
    uni.setStorageSync(MONTHLY_BUDGETS_CACHE_KEY, { userId, list, savedAt: Date.now() })
  } catch {
    // 存储满等场景静默失败
  }
}

export function clearMonthlyBudgetsCache() {
  try {
    uni.removeStorageSync(MONTHLY_BUDGETS_CACHE_KEY)
  } catch {
    // ignore
  }
}

export function loadAmountsHidden() {
  try {
    return Boolean(uni.getStorageSync(AMOUNTS_HIDDEN_KEY))
  } catch {
    return false
  }
}

export function saveAmountsHidden(hidden) {
  try {
    uni.setStorageSync(AMOUNTS_HIDDEN_KEY, hidden ? 1 : 0)
  } catch {
    // ignore
  }
}

export function loadRatesCache() {
  const data = safeParse(uni.getStorageSync(RATES_CACHE_KEY))
  if (!data || !data.rates || typeof data.rates !== 'object') return null
  if (Date.now() - Number(data.savedAt || 0) > RATES_MAX_AGE) return null
  return data.rates
}

export function saveRatesCache(rates) {
  try {
    uni.setStorageSync(RATES_CACHE_KEY, { rates, savedAt: Date.now() })
  } catch {
    // ignore
  }
}

export function loadCustomCategories() {
  const list = safeParse(uni.getStorageSync(CUSTOM_CATEGORIES_KEY))
  if (!Array.isArray(list)) return []
  return list.filter((item) => typeof item === 'string' && item.trim())
}

// 读取 storage 原始值（用于管理面板「本地存储诊断」，帮助定位数据是否真实存在）
export function loadCustomCategoriesRaw() {
  try {
    const raw = uni.getStorageSync(CUSTOM_CATEGORIES_KEY)
    return raw === undefined || raw === null || raw === '' ? null : raw
  } catch {
    return null
  }
}

export function saveCustomCategories(list) {
  try {
    // 与前端上限保持一致，防御性截断，避免脏数据超限
    const safeList = Array.isArray(list) ? list.filter((item) => typeof item === 'string' && item.trim()) : []
    uni.setStorageSync(CUSTOM_CATEGORIES_KEY, safeList.slice(0, MAX_CUSTOM_CATEGORIES))
  } catch {
    // ignore
  }
}
