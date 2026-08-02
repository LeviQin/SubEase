const CURRENCY_SYMBOL_MAP = {
  CNY: '¥',
  USD: '$',
  EUR: '€'
}

const YEARLY_MULTIPLIER_MAP = {
  月付: 12,
  季度付: 4,
  年付: 1
}

function normalizeDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function pad(num) {
  return `${num}`.padStart(2, '0')
}

export function getCurrencySymbol(currency) {
  return CURRENCY_SYMBOL_MAP[currency] || currency
}

export function formatCurrency(price, currency, hideAmount = false) {
  if (hideAmount) return '***'
  const symbol = getCurrencySymbol(currency)
  const amount = Number(price || 0)
  if (currency === 'CNY') return `${symbol}${amount.toLocaleString('zh-CN')}`
  return `${currency} ${amount.toLocaleString('en-US')}`
}

export function formatCycleLabel(item) {
  return `${item.category} · ${item.cycle} · ${formatShortDate(item.nextDate)}`
}

export function formatShortDate(dateString) {
  const date = normalizeDate(dateString)
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
}

export function getDaysUntil(dateString) {
  const target = normalizeDate(dateString)
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  return Math.ceil((end.getTime() - start.getTime()) / 86400000)
}

export function getUpcomingSubscriptions(subscriptions, days = 7) {
  return subscriptions
    .filter((item) => {
      const diff = getDaysUntil(item.nextDate)
      return diff >= 0 && diff <= days
    })
    .sort((a, b) => normalizeDate(a.nextDate) - normalizeDate(b.nextDate))
}

export function getVisibleSubscriptions(subscriptions, searchKeyword, filterCategory, sortOrder) {
  const keyword = (searchKeyword || '').trim().toLowerCase()
  const list = subscriptions.filter((item) => {
    const searchMatched = !keyword || item.name.toLowerCase().includes(keyword)
    const categoryMatched = !filterCategory || item.category === filterCategory
    return searchMatched && categoryMatched
  })

  list.sort((a, b) => {
    if (sortOrder === 'price') return Number(a.price) - Number(b.price)
    return normalizeDate(a.nextDate) - normalizeDate(b.nextDate)
  })

  return list
}

export function getSummaryStats(subscriptions, rates = {}) {
  const toCny = (price, currency) => {
    const rate = Number(rates[String(currency || 'CNY').toUpperCase()]) || 1
    return Number(price || 0) * rate
  }

  const monthlyTotal = subscriptions.reduce((sum, item) => {
    const cny = toCny(item.price, item.currency)
    if (item.cycle === '月付') return sum + cny
    if (item.cycle === '季度付') return sum + cny / 3
    if (item.cycle === '年付') return sum + cny / 12
    return sum
  }, 0)

  const yearlyTotal = subscriptions.reduce((sum, item) => {
    const multiplier = YEARLY_MULTIPLIER_MAP[item.cycle] || 1
    return sum + toCny(item.price, item.currency) * multiplier
  }, 0)

  return {
    monthlyTotal: Math.round(monthlyTotal),
    yearlyTotal: Math.round(yearlyTotal)
  }
}

export function getAnalyticsSummary(subscriptions, rates = {}) {
  const list = Array.isArray(subscriptions) ? subscriptions : []
  const toCny = (price, currency) => {
    const rate = Number(rates[String(currency || 'CNY').toUpperCase()]) || 1
    return Number(price || 0) * rate
  }

  // 月均/年度支出（复用 getSummaryStats 的折算逻辑）
  const { monthlyTotal, yearlyTotal } = getSummaryStats(list, rates)

  // 总支出：全部折算 CNY（避免多币种直接相加）
  const totalSpend = Math.round(list.reduce((sum, item) => sum + toCny(item.price, item.currency), 0))

  // 分类支出分布（按金额降序）
  const categoryMap = list.reduce((map, item) => {
    const key = item.category || '其他'
    map[key] = (map[key] || 0) + toCny(item.price, item.currency)
    return map
  }, {})
  const categoryStats = Object.keys(categoryMap)
    .map((category) => ({ category, amount: Math.round(categoryMap[category]) }))
    .sort((a, b) => b.amount - a.amount)
  const categoryTotal = categoryStats.reduce((sum, item) => sum + item.amount, 0)
  categoryStats.forEach((item) => {
    item.percent = categoryTotal ? Math.round((item.amount / categoryTotal) * 100) : 0
  })

  const hottestCategory = categoryStats.length ? categoryStats[0].category : '暂无'
  const hottestCategoryAmount = categoryStats.length ? categoryStats[0].amount : 0

  // 周期分布（金额占比）
  const cycleMap = list.reduce((map, item) => {
    const key = item.cycle || '其他'
    map[key] = map[key] || { count: 0, amount: 0 }
    map[key].count += 1
    map[key].amount += toCny(item.price, item.currency)
    return map
  }, {})
  const cycleStats = Object.keys(cycleMap).map((cycle) => ({
    cycle,
    count: cycleMap[cycle].count,
    amount: Math.round(cycleMap[cycle].amount)
  }))
  const cycleTotal = cycleStats.reduce((sum, item) => sum + item.amount, 0)
  cycleStats.forEach((item) => {
    item.percent = cycleTotal ? Math.round((item.amount / cycleTotal) * 100) : 0
  })

  // 高消费排行：按月均成本（折算 CNY）降序取前 5
  const monthlyCost = (item) => {
    const cny = toCny(item.price, item.currency)
    if (item.cycle === '季度付') return cny / 3
    if (item.cycle === '年付') return cny / 12
    return cny
  }
  const topSpenders = list
    .map((item) => ({
      name: item.name,
      price: Number(item.price || 0),
      currency: item.currency,
      monthlyCost: Math.round(monthlyCost(item))
    }))
    .sort((a, b) => b.monthlyCost - a.monthlyCost)
    .slice(0, 5)

  // 下月扣款预测：月付必计；季度付/年付仅当 nextDate 落在下个自然月计入
  const now = new Date()
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 1)
  const nextMonthTotal = Math.round(
    list.reduce((sum, item) => {
      if (item.cycle === '月付') return sum + toCny(item.price, item.currency)
      const nextDate = normalizeDate(item.nextDate)
      if (nextDate >= nextMonthStart && nextDate < nextMonthEnd) {
        return sum + toCny(item.price, item.currency)
      }
      return sum
    }, 0)
  )

  return {
    totalSpend,
    monthlyTotal,
    yearlyTotal,
    count: list.length,
    hottestCategory,
    hottestCategoryAmount,
    categoryStats,
    cycleStats,
    topSpenders,
    nextMonthTotal
  }
}

export function createSubscriptionPayload(formState, currentFilter) {
  return {
    id: formState.id || Date.now(),
    name: (formState.name || '').trim(),
    price: Number(formState.price || 0),
    currency: formState.currency || 'CNY',
    cycle: formState.cycle || '月付',
    category: formState.category || currentFilter || '其他',
    nextDate: formState.nextDate,
    autoRenew: Boolean(formState.autoRenew),
    remindDays: Number(formState.remindDays || 3),
    method: formState.method || '',
    notes: formState.notes || ''
  }
}

export function cloneSubscription(item) {
  return JSON.parse(JSON.stringify(item))
}
