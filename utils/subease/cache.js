// 本地缓存：订阅列表（弱网/离线可用）+ 汇率（24h 有效）
// 订阅数据为低频变更数据，缓存策略：先渲染缓存 → 后台刷新 → 失败回退缓存

const SUBSCRIPTIONS_CACHE_KEY = 'subease-subscriptions-cache'
const RATES_CACHE_KEY = 'subease-rates-cache'
const CUSTOM_CATEGORIES_KEY = 'subease-custom-categories'
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
  return data.list
}

export function saveSubscriptionsCache(list) {
  try {
    uni.setStorageSync(SUBSCRIPTIONS_CACHE_KEY, { list, savedAt: Date.now() })
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

export function saveCustomCategories(list) {
  try {
    uni.setStorageSync(CUSTOM_CATEGORIES_KEY, Array.isArray(list) ? list : [])
  } catch {
    // ignore
  }
}
