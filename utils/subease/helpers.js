const CURRENCY_SYMBOL_MAP = {
  CNY: '¥',
  USD: '$',
  EUR: '€'
}

// 无小数货币：价格按整数展示（日元/韩元习惯无角分）
const NO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW'])

const YEARLY_MULTIPLIER_MAP = {
  月付: 12,
  季度付: 4,
  年付: 1
}

const CYCLE_MONTHS_MAP = {
  月付: 1,
  季度付: 3,
  年付: 12
}

// ═══ 日期工具（统一本地时区解析，避免 new Date('YYYY-MM-DD') 按 UTC 解析的偏移）═══

function pad(num) {
  return `${num}`.padStart(2, '0')
}

export function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return new Date(value)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    // 防御非法日期（如 02-31 被 JS 自动溢出），溢出则回退到今天
    if (!Number.isNaN(date.getTime()) && date.getDate() === d) return date
    return new Date()
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

export function formatDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function todayStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

// 月份加减，处理月末溢出：1/31 +1月 → 2/28/29 而非 3/3
function addMonthsClamped(date, months, anchorDay = date.getDate()) {
  const result = new Date(date)
  result.setDate(1)
  result.setMonth(result.getMonth() + months)
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(anchorDay, lastDay))
  return result
}

function roundMoney(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0
}

function getPaidCycles(item) {
  return Math.max(1, Math.floor(Number(item.paidCycles) || 1))
}

// 有「上次扣款日」时按实际扣款记录生成事件：预付多周期只记一次，
// 自动续费从展示用的下一次付款日继续生成；没有上次扣款日的旧数据由调用方按周期估算。
function getActualPaymentEvents(item, startDate, endDate, rates = {}) {
  if (!item.lastPaidDate) return null

  const amount = toCny(item.price, item.currency, rates)
  const cycleMonths = CYCLE_MONTHS_MAP[item.cycle] || 1
  const lastPaidDate = parseDate(item.lastPaidDate)
  const events = []
  if (lastPaidDate >= startDate && lastPaidDate < endDate) {
    events.push({ date: lastPaidDate, amount: amount * getPaidCycles(item) })
  }

  if (item.autoRenew) {
    let nextDate = parseDate(item.displayDate || item.nextDate)
    const anchorDay = nextDate.getDate()
    let guard = 0
    while (nextDate < endDate && guard < 120) {
      if (nextDate >= startDate) {
        events.push({ date: nextDate, amount })
      }
      nextDate = addMonthsClamped(nextDate, cycleMonths, anchorDay)
      guard += 1
    }
  }

  return events
}

function getLegacyPaymentEvents(item, startDate, endDate, rates = {}) {
  const amount = toCny(item.price, item.currency, rates)
  if (!amount) return []
  const anchor = parseDate(item.displayDate || item.nextDate)
  const cycleMonths = CYCLE_MONTHS_MAP[item.cycle] || 1
  const anchorDay = anchor.getDate()
  const events = []
  for (let offset = -120; offset <= 120; offset += 1) {
    const date = addMonthsClamped(anchor, offset * cycleMonths, anchorDay)
    if (date < startDate || date >= endDate) continue
    // 没有历史记录的手动续费订阅，只能确认锚点之后的扣款。
    if (offset < 0 && !item.autoRenew) continue
    events.push({ date, amount })
  }
  return events
}

function getPaymentRecordsForSubscription(paymentRecords, subscriptionId) {
  const id = Number(subscriptionId)
  return (Array.isArray(paymentRecords) ? paymentRecords : []).filter(
    (record) => Number(record.subscriptionId) === id
  )
}

function getPaymentEvents(item, startDate, endDate, rates = {}, paymentRecords = []) {
  const records = getPaymentRecordsForSubscription(paymentRecords, item.id)
  if (!records.length) {
    return {
      events: null,
      estimated: true,
      missingRates: false,
      hasHistory: false
    }
  }

  const recordDates = records
    .map((record) => parseDate(record.paidDate))
    .filter((date) => date && !Number.isNaN(date.getTime()))
  const firstRecordDate = recordDates.length
    ? new Date(Math.min(...recordDates.map((date) => date.getTime())))
    : endDate
  const events = []
  let missingRates = false

  records.forEach((record) => {
    const date = parseDate(record.paidDate)
    if (date < startDate || date >= endDate) return
    const amount = Number(record.cnyAmount)
    if (record.cnyAmount == null || !Number.isFinite(amount)) {
      missingRates = true
      return
    }
    events.push({
      date,
      amount: amount * Math.max(1, Number(record.cycles) || 1),
      recorded: true
    })
  })

  let estimated = false
  if (startDate < firstRecordDate) {
    const legacyEnd = firstRecordDate < endDate ? firstRecordDate : endDate
    const legacyEvents = getLegacyPaymentEvents(item, startDate, legacyEnd, rates)
    if (legacyEvents.length) {
      events.push(...legacyEvents)
      estimated = true
    }
  }

  return { events, estimated, missingRates, hasHistory: true }
}

// ═══ 金额工具 ═══

export function getCurrencySymbol(currency) {
  return CURRENCY_SYMBOL_MAP[currency] || currency
}

export function formatCurrency(price, currency, hideAmount = false) {
  if (hideAmount) return '***'
  const code = String(currency || 'CNY').toUpperCase()
  const symbol = CURRENCY_SYMBOL_MAP[code] || code
  const amount = Number(price || 0)
  const fixed = NO_DECIMAL_CURRENCIES.has(code)
    ? Math.round(amount).toString()
    : amount.toFixed(2).replace(/\.?0+$/, '')
  return code === 'CNY' ? `${symbol}${fixed}` : `${symbol} ${fixed}`
}

export function getAdaptiveAmountFontSize(value, maxSize, minSize, maxChars) {
  const textLength = String(value ?? '').length
  const max = Number(maxSize) || 44
  const min = Number(minSize) || 24
  const chars = Math.max(1, Number(maxChars) || 7)
  const ratio = Math.min(1, chars / Math.max(textLength, chars))
  const size = Math.max(min, Math.round(max * ratio))
  return `${size}rpx`
}

// 统一折算 CNY（模块级单例，供统计复用）
function toCny(price, currency, rates) {
  const code = String(currency || 'CNY').toUpperCase()
  if (code === 'CNY') return Number(price || 0)
  const rate = Number((rates || {})[code])
  if (!Number.isFinite(rate) || rate <= 0) return 0
  return Number(price || 0) * rate
}

export function hasMissingRates(subscriptions, rates = {}, paymentRecords = []) {
  const subscriptionMissing = (Array.isArray(subscriptions) ? subscriptions : []).some((item) => {
    const code = String(item.currency || 'CNY').toUpperCase()
    const rate = Number((rates || {})[code])
    return code !== 'CNY' && (!Number.isFinite(rate) || rate <= 0)
  })
  const paymentMissing = (Array.isArray(paymentRecords) ? paymentRecords : []).some(
    (record) => record && record.cnyAmount == null && String(record.currency || 'CNY').toUpperCase() !== 'CNY'
  )
  return subscriptionMissing || paymentMissing
}

// ═══ 到期日滚动：订阅过期后自动续算到下一周期 ═══

/**
 * 将到期日滚动到「>= today」的最近一个周期日。
 * 若未过期则原样返回；autoRenew=false 的订阅不做滚动（保持原日期，交由状态标记）。
 */
export function rollNextDate(dateString, cycle, today = new Date()) {
  const months = CYCLE_MONTHS_MAP[cycle] || 1
  let date = parseDate(dateString)
  const anchorDay = date.getDate()
  const todayStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let guard = 0
  while (date < todayStartDate && guard < 60) {
    date = addMonthsClamped(date, months, anchorDay)
    guard += 1
  }
  return formatDateString(date)
}

// 由「上次扣款日 → 下次付款日」反推预付周期数（纯函数）
// 先按月数差估算期数，再用「第 N 个周期的实际日期」校验是否已覆盖到下次付款日，
// 正确处理月末溢出（1-31 → 3-31 为 2 期）与差几天不满整周期的情况。
// 例：上次扣款 2026-08-14、下次付款 2027-02-14、月付 → 6 期；年付买 3 年 → 3 期。
export function calcPaidCycles(lastPaidDate, nextDate, cycle) {
  const months = CYCLE_MONTHS_MAP[cycle] || 1
  const start = parseDate(lastPaidDate)
  const target = parseDate(nextDate)
  if (!start || !target || Number.isNaN(start.getTime()) || Number.isNaN(target.getTime())) {
    return 1
  }
  if (target <= start) return 1

  const monthDiff =
    (target.getFullYear() * 12 + target.getMonth()) -
    (start.getFullYear() * 12 + start.getMonth())
  let count = Math.floor(monthDiff / months)
  // 校验：count 个周期后的实际日期（月末钳制）是否已到达/超过下次付款日
  const base = addMonthsClamped(start, count * months)
  if (base > target) count -= 1
  return Math.max(1, count)
}

/**
 * 归一化订阅列表：为每条记录计算展示用日期与状态，供列表/统计/首页统一消费。
 * - displayDate：展示用下次付款日（自动续费过期则滚动，手动续费保持原值）
 * - status：'active' 正常 / 'rolled' 已自动续期 / 'expired' 已过期（手动续费）
 * - days：距 displayDate 的天数（负数表示已过期）
 */
export function normalizeSubscriptions(list, today = new Date()) {
  return (Array.isArray(list) ? list : []).map((item) => {
    const raw = item.nextDate || formatDateString(today)
    const isExpired = parseDate(raw) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (!isExpired) {
      return {
        ...item,
        displayDate: raw,
        status: 'active',
        days: getDaysUntil(raw, today)
      }
    }
    if (item.autoRenew) {
      const displayDate = rollNextDate(raw, item.cycle, today)
      return {
        ...item,
        displayDate,
        status: 'rolled',
        days: getDaysUntil(displayDate, today)
      }
    }
    return {
      ...item,
      displayDate: raw,
      status: 'expired',
      days: getDaysUntil(raw, today)
    }
  })
}

// ═══ 计算工具 ═══

export function formatShortDate(dateString) {
  const date = parseDate(dateString)
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
}

export function formatFullDate(dateString) {
  const date = parseDate(dateString)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function getDaysUntil(dateString, today = new Date()) {
  const target = parseDate(dateString)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target.getTime() - start.getTime()) / 86400000)
}

// 近期待付：基于 displayDate（已滚动），仅取未来 days 天内
export function getUpcomingSubscriptions(subscriptions, days = 7) {
  return (Array.isArray(subscriptions) ? subscriptions : [])
    .filter((item) => item.status !== 'expired')
    .filter((item) => {
      const diff = getDaysUntil(item.displayDate || item.nextDate)
      return diff >= 0 && diff <= days
    })
    .sort((a, b) => getDaysUntil(a.displayDate || a.nextDate) - getDaysUntil(b.displayDate || b.nextDate))
}

export function getVisibleSubscriptions(subscriptions, searchKeyword, filterCategory, sortOrder) {
  const keyword = (searchKeyword || '').trim().toLowerCase()
  const list = (Array.isArray(subscriptions) ? subscriptions : []).filter((item) => {
    const searchMatched = !keyword || String(item.name || '').toLowerCase().includes(keyword)
    const categoryMatched = !filterCategory || item.category === filterCategory
    return searchMatched && categoryMatched
  })

  list.sort((a, b) => {
    if (sortOrder === 'price') return Number(a.price) - Number(b.price)
    // 按展示日期排序；已过期的手动续费订阅沉底
    const aDate = parseDate(a.displayDate || a.nextDate)
    const bDate = parseDate(b.displayDate || b.nextDate)
    if (a.status === 'expired' && b.status !== 'expired') return 1
    if (b.status === 'expired' && a.status !== 'expired') return -1
    return aDate - bDate
  })

  return list
}

export function getSummaryStats(subscriptions, rates = {}) {
  const list = Array.isArray(subscriptions) ? subscriptions : []
  const activeList = list.filter((item) => item.status !== 'expired')
  const monthlyTotal = activeList.reduce((sum, item) => {
    const cny = toCny(item.price, item.currency, rates)
    if (item.cycle === '月付') return sum + cny
    if (item.cycle === '季度付') return sum + cny / 3
    if (item.cycle === '年付') return sum + cny / 12
    return sum
  }, 0)

  const yearlyTotal = activeList.reduce((sum, item) => {
    const multiplier = YEARLY_MULTIPLIER_MAP[item.cycle] || 1
    return sum + toCny(item.price, item.currency, rates) * multiplier
  }, 0)

  // 下月扣款预测：只计算下个月实际发生的下一次扣款；已停用的手动续费订阅不计。
  // 预付多个周期且预付截止日在下个月或更晚时，下个月无需再次付款。
  const today = todayStart()
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 1)
  const nextMonthTotal = roundMoney(
    list.reduce((sum, item) => {
      if (item.status === 'expired') return sum
      const nextDate = parseDate(item.displayDate || item.nextDate)

      // 当前月已到期的月付订阅，下一次扣款会落在下个月；其他周期按周期顺延。
      const nextMonthDueDate = nextDate >= nextMonthStart
        ? nextDate
        : addMonthsClamped(nextDate, CYCLE_MONTHS_MAP[item.cycle] || 1)
      if (nextMonthDueDate >= nextMonthStart && nextMonthDueDate < nextMonthEnd) {
        return sum + toCny(item.price, item.currency, rates)
      }
      return sum
    }, 0)
  )

  return {
    currentMonthTotal: (getMonthlyTrend(list, rates, 1)[0] || {}).amount || 0,
    monthlyTotal: roundMoney(monthlyTotal),
    yearlyTotal: roundMoney(yearlyTotal),
    nextMonthTotal
  }
}

export function getAnalyticsSummary(subscriptions, rates = {}, paymentRecords = []) {
  const list = Array.isArray(subscriptions) ? subscriptions : []
  const activeList = list.filter((item) => item.status !== 'expired')

  // 月均/年度支出（复用 getSummaryStats 的折算逻辑）
  const { currentMonthTotal, monthlyTotal, yearlyTotal, nextMonthTotal } = getSummaryStats(list, rates)

  // 本月支出：有付款历史时优先使用真实记录；旧订阅继续按周期估算。
  const currentTrend = getMonthlyTrend(list, rates, 1, paymentRecords)
  const totalSpend = paymentRecords.length ? (currentTrend[0]?.amount || 0) : currentMonthTotal

  const monthlyCost = (item) => {
    const cny = toCny(item.price, item.currency, rates)
    if (item.cycle === '季度付') return cny / 3
    if (item.cycle === '年付') return cny / 12
    return cny
  }

  // 分类月均支出分布（仅统计仍有效的订阅，按金额降序）
  const categoryMap = activeList.reduce((map, item) => {
    const key = item.category || '其他'
    map[key] = (map[key] || 0) + monthlyCost(item)
    return map
  }, {})
  const categoryStats = Object.keys(categoryMap)
    .map((category) => ({ category, amount: roundMoney(categoryMap[category]) }))
    .sort((a, b) => b.amount - a.amount)
  const categoryTotal = categoryStats.reduce((sum, item) => sum + item.amount, 0)
  categoryStats.forEach((item) => {
    item.percent = categoryTotal ? Math.round((item.amount / categoryTotal) * 100) : 0
  })

  const hottestCategory = categoryStats.length ? categoryStats[0].category : '暂无'
  const hottestCategoryAmount = categoryStats.length ? categoryStats[0].amount : 0

  // 周期分布（订阅数量占比）
  const cycleMap = activeList.reduce((map, item) => {
    const key = item.cycle || '其他'
    map[key] = (map[key] || 0) + 1
    return map
  }, {})
  const cycleStats = Object.keys(cycleMap).map((cycle) => ({
    cycle,
    count: cycleMap[cycle]
  }))
  const cycleTotal = cycleStats.reduce((sum, item) => sum + item.count, 0)
  cycleStats.forEach((item) => {
    item.percent = cycleTotal ? Math.round((item.count / cycleTotal) * 100) : 0
  })

  // 高消费排行：按月均成本（折算 CNY）降序取前 5
  const topSpenders = activeList
    .map((item) => ({
      name: item.name,
      price: Number(item.price || 0),
      currency: item.currency,
      monthlyCost: roundMoney(monthlyCost(item))
    }))
    .sort((a, b) => b.monthlyCost - a.monthlyCost)
    .slice(0, 5)

  // 下月扣款预测：由 getSummaryStats 统一计算实际下一次扣款日
  return {
    totalSpend,
    monthlyTotal,
    yearlyTotal,
    count: activeList.length,
    hottestCategory,
    hottestCategoryAmount,
    categoryStats,
    cycleStats,
    topSpenders,
    nextMonthTotal,
    estimatedData: Boolean(currentTrend.estimatedData),
    missingRates: Boolean(currentTrend.missingRates) || hasMissingRates(list, rates, paymentRecords)
  }
}

// ═══ 月度预算：只消费统一统计结果，不重复计算付款口径 ═══

export function getBudgetStatus(monthlyBudgetCny, totalSpend, estimatedData = false) {
  const budget = Math.max(0, roundMoney(monthlyBudgetCny))
  const spent = Math.max(0, roundMoney(totalSpend))
  if (!budget) {
    return {
      enabled: false,
      budget: 0,
      spent,
      remaining: 0,
      overAmount: 0,
      percent: 0,
      warning: false,
      over: false,
      estimatedData: Boolean(estimatedData)
    }
  }

  const remaining = roundMoney(budget - spent)
  const percent = roundMoney((spent / budget) * 100)
  return {
    enabled: true,
    budget,
    spent,
    remaining,
    overAmount: roundMoney(Math.max(0, spent - budget)),
    percent,
    warning: percent >= 80,
    over: remaining < 0,
    estimatedData: Boolean(estimatedData)
  }
}

export function getBudgetMonthOptions(count = 6, baseDate = new Date()) {
  const safeCount = Math.max(1, Math.min(24, Number(count) || 6))
  const options = []
  for (let offset = safeCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() - offset, 1)
    const month = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
    options.push({
      month,
      label: `${date.getFullYear()}年${date.getMonth() + 1}月`
    })
  }
  return options
}

export function getBudgetReview(months = [], budgets = [], estimatedData = false) {
  const budgetMap = new Map()
  const source = Array.isArray(budgets) ? budgets : []
  source.forEach((item) => {
    const month = String(item?.month || '').trim()
    const amount = Number(item?.budgetCny)
    if (!month || !Number.isFinite(amount) || amount <= 0) return
    budgetMap.set(month, roundMoney(amount))
  })

  return (Array.isArray(months) ? months : []).map((item) => {
    const budgetCny = budgetMap.get(String(item.key)) || 0
    return {
      ...item,
      budgetCny,
      budgetStatus: getBudgetStatus(budgetCny, item.amount, estimatedData)
    }
  })
}

export function getSavingsSuggestions(subscriptions, analytics = {}, budgetStatus = {}) {
  if (!budgetStatus.enabled) return []

  const list = Array.isArray(subscriptions) ? subscriptions : []
  const suggestions = []
  const push = (suggestion) => {
    if (suggestions.length < 3) suggestions.push(suggestion)
  }

  if (budgetStatus.percent >= 80 && analytics.topSpenders && analytics.topSpenders[0]) {
    const topSpender = analytics.topSpenders[0]
    push({
      type: 'top-spender',
      name: String(topSpender.name || '未命名订阅'),
      monthlyCost: roundMoney(topSpender.monthlyCost)
    })
  }

  const autoRenewCount = list.filter((item) => item && item.autoRenew).length
  if (autoRenewCount > 0) {
    push({ type: 'auto-renew', count: autoRenewCount })
  }

  const expiredCount = list.filter((item) => item && item.status === 'expired').length
  if (expiredCount > 0) {
    push({ type: 'expired', count: expiredCount })
  }

  const categoryCount = {}
  list.forEach((item) => {
    const category = String((item && item.category) || '其他')
    categoryCount[category] = (categoryCount[category] || 0) + 1
  })
  const duplicateCategories = Object.keys(categoryCount).filter((category) => categoryCount[category] >= 2)
  if (duplicateCategories.length) {
    push({ type: 'duplicate-category', categories: duplicateCategories.slice(0, 2) })
  }

  return suggestions
}

// ═══ 年度账单：按实际扣款与订阅周期估算指定自然年 1-12 月的扣款分布 ═══

export function getYearlyBreakdown(subscriptions, rates = {}, year = new Date().getFullYear(), paymentRecords = []) {
  const list = Array.isArray(subscriptions) ? subscriptions : []
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)
  const months = []
  for (let m = 0; m < 12; m += 1) {
    months.push({
      key: `${year}-${pad(m + 1)}`,
      label: `${m + 1}月`,
      index: m,
      amount: 0
    })
  }

  let estimatedData = false
  let missingRates = false
  list.forEach((item) => {
    const paymentEvents = getPaymentEvents(item, yearStart, yearEnd, rates, paymentRecords)
    if (!paymentEvents.hasHistory || paymentEvents.estimated) estimatedData = true
    if (paymentEvents.missingRates) missingRates = true
    if (paymentEvents.events) {
      paymentEvents.events.forEach((event) => {
        months[event.date.getMonth()].amount += event.amount
      })
      return
    }
    const cycleMonths = CYCLE_MONTHS_MAP[item.cycle] || 1
    const amount = toCny(item.price, item.currency, rates)
    if (!amount) return
    const actualEvents = getActualPaymentEvents(item, yearStart, yearEnd, rates)
    if (actualEvents) {
      actualEvents.forEach((event) => {
        months[event.date.getMonth()].amount += event.amount
      })
      return
    }
    if (item.status === 'expired') return
    const isAutoRenew = !!item.autoRenew
    const anchor = parseDate(item.displayDate || item.nextDate)
    const anchorIndex = anchor.getFullYear() * 12 + anchor.getMonth()
    months.forEach((month) => {
      const offset = anchorIndex - (year * 12 + month.index)
      if (offset % cycleMonths !== 0) return
      // 没有上次扣款日的旧数据：手动续费只计已发生的扣款，自动续费估算全年。
      if (!isAutoRenew && offset < 0) return
      month.amount += amount
    })
  })

  const roundedMonths = months.map((month) => ({ ...month, amount: roundMoney(month.amount) }))
  const total = roundedMonths.reduce((sum, month) => sum + month.amount, 0)
  const monthlyAverage = roundMoney(total / 12)
  const peakMonth = roundedMonths.reduce(
    (best, month) => (month.amount > best.amount ? month : best),
    { label: '-', amount: 0 }
  )

  // TOP 订阅：按年内实际/估算扣款总额
  const topMap = {}
  list.forEach((item) => {
    const paymentEvents = getPaymentEvents(item, yearStart, yearEnd, rates, paymentRecords)
    if (paymentEvents.events) {
      const actualTotal = paymentEvents.events.reduce((sum, event) => sum + event.amount, 0)
      if (actualTotal > 0) {
        const key = String(item.name || '未命名')
        topMap[key] = (topMap[key] || 0) + actualTotal
      }
      return
    }
    const actualEvents = getActualPaymentEvents(item, yearStart, yearEnd, rates)
    if (actualEvents) {
      const actualTotal = actualEvents.reduce((sum, event) => sum + event.amount, 0)
      if (actualTotal > 0) {
        const key = String(item.name || '未命名')
        topMap[key] = (topMap[key] || 0) + actualTotal
      }
      return
    }
    if (item.status === 'expired') return
    const cycleMonths = CYCLE_MONTHS_MAP[item.cycle] || 1
    const isAutoRenew = !!item.autoRenew
    const anchor = parseDate(item.displayDate || item.nextDate)
    const anchorIndex = anchor.getFullYear() * 12 + anchor.getMonth()
    let count = 0
    roundedMonths.forEach((month) => {
      const offset = anchorIndex - (year * 12 + month.index)
      if (offset % cycleMonths !== 0) return
      if (!isAutoRenew && offset < 0) return
      count += 1
    })
    if (!count) return
    const key = String(item.name || '未命名')
    topMap[key] = (topMap[key] || 0) + toCny(item.price, item.currency, rates) * count
  })
  const topSubscriptions = Object.keys(topMap)
    .map((name) => ({ name, amount: roundMoney(topMap[name]) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  return {
    year,
    months: roundedMonths,
    total: roundMoney(total),
    monthlyAverage,
    peakMonth: { label: peakMonth.label, amount: roundMoney(peakMonth.amount) },
    topSubscriptions,
    estimatedData,
    missingRates
  }
}

// ═══ 月度趋势：基于当前订阅与周期反推历史实际扣款 ═══

/**
 * 生成近 N 个月（含本月）的月度支出趋势（按实际扣款/周期估算，非均摊）。
 * 以每条订阅的 displayDate（下一次扣款日）为锚点，往前每 cycleMonths 个月发生一次扣款；
 * 命中目标月则计入当月。已过期自动续费的订阅会把「滚动前当月已发生的扣款」正确归入历史。
 */
export function getMonthlyTrend(subscriptions, rates = {}, months = 6, paymentRecords = []) {
  const list = Array.isArray(subscriptions) ? subscriptions : []
  const now = new Date()
  const buckets = []
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${date.getFullYear()}-${pad(date.getMonth() + 1)}`,
      label: `${date.getFullYear()}年${date.getMonth() + 1}月`,
      shortLabel: `${date.getMonth() + 1}月`,
      amount: 0,
      monthIndex: date.getFullYear() * 12 + date.getMonth()
    })
  }
  const firstBucket = buckets[0]
  const rangeStart = new Date(
    Math.floor(firstBucket.monthIndex / 12),
    firstBucket.monthIndex % 12,
    1
  )
  const lastBucket = buckets[buckets.length - 1]
  const rangeEnd = new Date(
    Math.floor(lastBucket.monthIndex / 12),
    (lastBucket.monthIndex % 12) + 1,
    1
  )

  let estimatedData = false
  let missingRates = false
  list.forEach((item) => {
    const paymentEvents = getPaymentEvents(item, rangeStart, rangeEnd, rates, paymentRecords)
    if (!paymentEvents.hasHistory || paymentEvents.estimated) estimatedData = true
    if (paymentEvents.missingRates) missingRates = true
    if (paymentEvents.events) {
      paymentEvents.events.forEach((event) => {
        const monthIndex = event.date.getFullYear() * 12 + event.date.getMonth()
        const bucket = buckets.find((itemBucket) => itemBucket.monthIndex === monthIndex)
        if (bucket) bucket.amount += event.amount
      })
      return
    }
    const cycleMonths = CYCLE_MONTHS_MAP[item.cycle] || 1
    const amount = toCny(item.price, item.currency, rates)
    if (!amount) return
    const actualEvents = getActualPaymentEvents(item, rangeStart, rangeEnd, rates)
    if (actualEvents) {
      actualEvents.forEach((event) => {
        const monthIndex = event.date.getFullYear() * 12 + event.date.getMonth()
        const bucket = buckets.find((itemBucket) => itemBucket.monthIndex === monthIndex)
        if (bucket) bucket.amount += event.amount
      })
      return
    }
    const anchor = parseDate(item.displayDate || item.nextDate)
    const anchorIndex = anchor.getFullYear() * 12 + anchor.getMonth()
    buckets.forEach((bucket) => {
      const offset = anchorIndex - bucket.monthIndex
      if (offset >= 0 && offset % cycleMonths === 0) bucket.amount += amount
    })
  })

  const result = buckets.map((bucket) => ({ ...bucket, amount: roundMoney(bucket.amount) }))
  result.estimatedData = estimatedData
  result.missingRates = missingRates
  return result
}

// 近 N 天内到期的订阅数量（供 tab 红点等提醒使用）
export function countUpcomingSoon(subscriptions, days = 3) {
  return (Array.isArray(subscriptions) ? subscriptions : []).filter((item) => {
    if (item.status === 'expired') return false
    const diff = getDaysUntil(item.displayDate || item.nextDate)
    return diff >= 0 && diff <= days
  }).length
}

// ═══ 订阅健康分：帮用户发现"该处理的订阅"，驱动回访与省钱 ═══

/**
 * 评分规则（100 分制）：
 * - 已过期未处理：每个 -10（上限 -30）
 * - 自动续费占比 > 60%：-10
 * - 同一分类订阅 >= 3 个：-10（提示重复支出）
 * - 超过半数订阅未设置支付方式：-5
 * 返回 { score, suggestions: [{ type: 'danger'|'warning'|'info', text }] }
 */
export function getSubscriptionHealth(subscriptions) {
  const list = Array.isArray(subscriptions) ? subscriptions : []
  if (!list.length) {
    return { score: 0, suggestions: [] }
  }

  let score = 100
  const suggestions = []

  const expiredCount = list.filter((item) => item.status === 'expired').length
  const autoRenewCount = list.filter((item) => item.autoRenew).length
  const noMethodCount = list.filter((item) => !String(item.method || '').trim()).length

  const categoryCount = {}
  list.forEach((item) => {
    const key = item.category || '其他'
    categoryCount[key] = (categoryCount[key] || 0) + 1
  })

  if (expiredCount > 0) {
    score -= Math.min(expiredCount * 10, 30)
    suggestions.push({
      type: 'danger',
      text: `有 ${expiredCount} 个订阅已过期未处理，建议停用或更新续费状态`
    })
  }

  if (autoRenewCount > 0 && autoRenewCount / list.length > 0.6) {
    score -= 10
    suggestions.push({
      type: 'warning',
      text: `${autoRenewCount} 个订阅为自动续费（占比 ${Math.round((autoRenewCount / list.length) * 100)}%），建议定期检查避免遗漏`
    })
  }

  const duplicateCategories = Object.keys(categoryCount).filter((key) => categoryCount[key] >= 3)
  if (duplicateCategories.length) {
    score -= 10
    suggestions.push({
      type: 'warning',
      text: `「${duplicateCategories.join('、')}」分类下各有 3 个以上订阅，可能存在重复支出`
    })
  }

  if (noMethodCount > 0 && noMethodCount / list.length > 0.5) {
    score -= 5
    suggestions.push({
      type: 'info',
      text: '超过半数订阅未设置支付方式，补充后方便对账'
    })
  }

  return { score: Math.max(0, score), suggestions }
}

// ═══ 本周支出：displayDate 落在本周（周一至周日）的扣款合计 ═══

export function getWeekExpense(subscriptions, rates = {}, paymentRecords = []) {
  const list = Array.isArray(subscriptions) ? subscriptions : []
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((day + 6) % 7))
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  const sundayEnd = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + 1)

  let total = 0
  let count = 0
  let estimatedData = false
  let missingRates = false
  list.forEach((item) => {
    const paymentEvents = getPaymentEvents(item, monday, sundayEnd, rates, paymentRecords)
    if (!paymentEvents.hasHistory || paymentEvents.estimated) estimatedData = true
    if (paymentEvents.missingRates) missingRates = true
    if (paymentEvents.events) {
      total += paymentEvents.events.reduce((sum, event) => sum + event.amount, 0)
      count += paymentEvents.events.length
      return
    }
    const actualEvents = getActualPaymentEvents(item, monday, sundayEnd, rates)
    if (actualEvents) {
      total += actualEvents.reduce((sum, event) => sum + event.amount, 0)
      count += actualEvents.length
      return
    }
    if (item.status === 'expired') return
    const candidates = [item.nextDate, item.displayDate].filter(Boolean).map(parseDate)
    const date = candidates.find((value) => value >= monday && value < sundayEnd)
    if (date) {
      total += toCny(item.price, item.currency, rates)
      count += 1
    }
  })
  return { total: roundMoney(total), count, estimatedData, missingRates }
}

export function createSubscriptionPayload(formState, currentFilter) {
  const price = Math.round(Number(formState.price || 0) * 100) / 100
  return {
    id: formState.id || Date.now(),
    name: (formState.name || '').trim(),
    price,
    currency: formState.currency || 'CNY',
    cycle: formState.cycle || '月付',
    category: formState.category || currentFilter || '其他',
    nextDate: formState.nextDate,
    lastPaidDate: formState.lastPaidDate || '',
    paidCycles: Math.max(1, Math.floor(Number(formState.paidCycles) || 1)),
    autoRenew: Boolean(formState.autoRenew),
    remindDays: Number(formState.remindDays || 3),
    method: formState.method || '',
    notes: formState.notes || ''
  }
}

export function cloneSubscription(item) {
  return JSON.parse(JSON.stringify(item))
}

// ═══ 订阅图标：首字色块（分类配色，未知分类按名称哈希稳定取色）═══

const CATEGORY_COLOR_MAP = {
  视频: '#7F77DD',
  音乐: '#1D9E75',
  工具: '#5770FF',
  其他: '#8A8F98'
}
const CATEGORY_PALETTE = ['#7F77DD', '#1D9E75', '#5770FF', '#D9930D', '#C4553A', '#2F6FED']

export function getCategoryColor(category) {
  const name = String(category || '其他').trim()
  if (CATEGORY_COLOR_MAP[name]) return CATEGORY_COLOR_MAP[name]
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length]
}

export function getAvatarText(name) {
  const text = String(name || '').trim()
  if (!text) return '?'
  const first = text[0]
  return /[a-zA-Z]/.test(first) ? first.toUpperCase() : first
}

// ═══ 自定义分类校验（纯函数，供新增/修改共用）═══
// existingCategories：用于重名校验的现有分类全集（默认分类 + 自定义 + 订阅中出现的分类）
// 修改分类时调用方需先剔除自身，避免「改回原名」被误判为重复
export function validateCustomCategory(name, existingCategories = []) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return { ok: false, message: '' }
  if (trimmed.length > 6) return { ok: false, message: '分类名称最多 6 个字' }
  if (existingCategories.includes(trimmed)) return { ok: false, message: '该分类已存在（默认/订阅中已使用）' }
  return { ok: true, value: trimmed }
}

// 分类重命名（纯函数）：返回新列表；未变化时返回原引用
export function renameCustomCategory(categories, oldName, newName) {
  if (oldName === newName) return categories
  return categories.map((item) => (item === oldName ? newName : item))
}

// 分类变更后同步订阅列表（纯函数）：删除分类 → 改为「其他」；改名 → 改为新名
export function applyCategoryChangeToSubscriptions(subscriptions, from, to) {
  return (subscriptions || []).map((item) =>
    item && item.category === from ? { ...item, category: to } : item
  )
}

// 合并有效自定义分类（纯函数）：本地存储的自定义分类 ∪ 订阅中使用的非默认分类
// 规则：除默认分类（视频/音乐/工具/其他）外，其他分类均视为自定义分类。
// 用于恢复「storage 丢失但订阅仍在使用的分类」为自定义分类（可管理、带角标）。
export function mergeCustomCategories(storedCategories, subscriptions, defaultCategories = []) {
  const stored = Array.isArray(storedCategories) ? storedCategories.filter(Boolean) : []
  const seen = new Set(stored)
  const merged = [...stored]
  ;(subscriptions || []).forEach((item) => {
    const cat = String((item && item.category) || '').trim()
    if (cat && !defaultCategories.includes(cat) && !seen.has(cat)) {
      seen.add(cat)
      merged.push(cat)
    }
  })
  return merged
}

// ═══ 批量导入：CSV 文本解析（纯函数）═══
// 支持两种格式：
// 1) 导出格式（含表头，12 列；兼容旧版 9 列）：名称,金额,货币,分类,周期,下次付款日,
//    上次扣款日,预付周期数,提醒天数,支付方式,自动续费,备注
//    「导出数据」生成的 CSV 可直接粘贴导入，实现导出→导入闭环
// 2) 简单格式（无表头，7 列）：名称,金额,货币,周期,分类,自动续费,下次付款日
// 自动续费取值：是/否、1/0、true/false、y/n；空默认 true

const EXPORT_HEADERS = [
  '名称', '金额', '货币', '分类', '周期', '下次付款日',
  '上次扣款日', '预付周期数', '提醒天数', '支付方式', '自动续费', '备注'
]

function parseCsvLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

function normalizeAutoRenew(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === '是' || v === 'true' || v === '1' || v === 'y' || v === 'yes') return true
  if (v === '否' || v === 'false' || v === '0' || v === 'n' || v === 'no') return false
  if (v === '') return true
  return null
}

export function parseSubscriptionsCsv(text) {
  const rawLines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (!rawLines.length) {
    return { valid: [], errors: [] }
  }

  const rows = rawLines.map(parseCsvLine)
  // 表头识别：第一行出现「名称」或「金额」列名
  const firstRow = rows[0] || []
  const hasNameHeader = firstRow.some((cell) => String(cell).trim() === '名称')
  const hasPriceHeader = firstRow.some((cell) => String(cell).trim() === '金额')
  const isHeader = hasNameHeader || hasPriceHeader

  const headerIndexes = {}
  if (isHeader) {
    firstRow.forEach((header, index) => {
      headerIndexes[String(header || '').trim()] = index
    })
  }

  const dataRows = isHeader ? rows.slice(1) : rows
  const valid = []
  const errors = []
  const seenNames = new Set()

  dataRows.forEach((fields, rowOffset) => {
    const lineNo = (isHeader ? 1 : 0) + rowOffset + 1

    let name = ''
    let price = 0
    let currency = 'CNY'
    let cycle = '月付'
    let category = '其他'
    let autoRenew = true
    let nextDate = ''
    let lastPaidDate = ''
    let paidCycles = 1
    let remindDays = 3
    let method = ''
    let notes = ''

    if (isHeader) {
      name = String(fields[headerIndexes['名称']] || '').trim()
      price = Number(fields[headerIndexes['金额']])
      currency = String(fields[headerIndexes['货币']] || 'CNY').trim().toUpperCase()
      category = String(fields[headerIndexes['分类']] || '').trim() || '其他'
      cycle = String(fields[headerIndexes['周期']] || '月付').trim()
      nextDate = String(fields[headerIndexes['下次付款日']] || '').trim()
      lastPaidDate = String(fields[headerIndexes['上次扣款日']] || '').trim()
      paidCycles = Number(fields[headerIndexes['预付周期数']] || 1)
      remindDays = Number(fields[headerIndexes['提醒天数']] || 3)
      method = String(fields[headerIndexes['支付方式']] || '').trim()
      notes = String(fields[headerIndexes['备注']] || '').trim()
      const ar = normalizeAutoRenew(fields[headerIndexes['自动续费']])
      if (ar === null) {
        errors.push(`第 ${lineNo} 行「${name}」自动续费取值无效（是/否/1/0）`)
        return
      }
      autoRenew = ar
    } else {
      const [rawName, rawPrice, rawCurrency, rawCycle, rawCategory, rawAutoRenew, rawNextDate] = fields
      name = String(rawName || '').trim()
      price = Number(rawPrice)
      currency = String(rawCurrency || 'CNY').trim().toUpperCase()
      cycle = String(rawCycle || '月付').trim()
      category = String(rawCategory || '').trim() || '其他'
      nextDate = String(rawNextDate || '').trim()
      const ar = normalizeAutoRenew(rawAutoRenew)
      if (ar === null) {
        errors.push(`第 ${lineNo} 行「${name}」自动续费取值无效（是/否/1/0）`)
        return
      }
      autoRenew = ar
    }

    if (!name) {
      errors.push(`第 ${lineNo} 行缺少名称`)
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      errors.push(`第 ${lineNo} 行「${name}」金额无效`)
      return
    }
    if (!['月付', '季度付', '年付'].includes(cycle)) {
      errors.push(`第 ${lineNo} 行「${name}」周期无效（月付/季度付/年付）`)
      return
    }
    if (!['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'KRW', 'AUD'].includes(currency)) {
      errors.push(`第 ${lineNo} 行「${name}」货币无效`)
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate || '') || formatDateString(parseDate(nextDate)) !== nextDate) {
      errors.push(`第 ${lineNo} 行「${name}」付款日期无效`)
      return
    }
    if (lastPaidDate && (!/^\d{4}-\d{2}-\d{2}$/.test(lastPaidDate) || formatDateString(parseDate(lastPaidDate)) !== lastPaidDate)) {
      errors.push(`第 ${lineNo} 行「${name}」上次扣款日期无效`)
      return
    }
    if (!Number.isInteger(paidCycles) || paidCycles < 1 || paidCycles > 120) {
      errors.push(`第 ${lineNo} 行「${name}」预付周期数无效`)
      return
    }
    if (!Number.isInteger(remindDays) || remindDays < 0 || remindDays > 365) {
      errors.push(`第 ${lineNo} 行「${name}」提醒天数无效`)
      return
    }
    const nameKey = name.toLowerCase()
    if (seenNames.has(nameKey)) {
      errors.push(`第 ${lineNo} 行「${name}」与文件内其他订阅重名`)
      return
    }
    seenNames.add(nameKey)
    valid.push({
      name,
      price: Math.round(price * 100) / 100,
      currency,
      cycle,
      category,
      autoRenew,
      nextDate,
      lastPaidDate,
      paidCycles,
      remindDays,
      method,
      notes
    })
  })

  return { valid, errors }
}
