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
function addMonthsClamped(date, months) {
  const result = new Date(date)
  const day = result.getDate()
  result.setDate(1)
  result.setMonth(result.getMonth() + months)
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(day, lastDay))
  return result
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

// 统一折算 CNY（模块级单例，供统计复用）
function toCny(price, currency, rates) {
  const rate = Number(rates[String(currency || 'CNY').toUpperCase()]) || 1
  return Number(price || 0) * rate
}

// ═══ 到期日滚动：订阅过期后自动续算到下一周期 ═══

/**
 * 将到期日滚动到「>= today」的最近一个周期日。
 * 若未过期则原样返回；autoRenew=false 的订阅不做滚动（保持原日期，交由状态标记）。
 */
export function rollNextDate(dateString, cycle, today = new Date()) {
  const months = CYCLE_MONTHS_MAP[cycle] || 1
  let date = parseDate(dateString)
  const todayStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let guard = 0
  while (date < todayStartDate && guard < 60) {
    date = addMonthsClamped(date, months)
    guard += 1
  }
  return formatDateString(date)
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
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
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
  const monthlyTotal = list.reduce((sum, item) => {
    const cny = toCny(item.price, item.currency, rates)
    if (item.cycle === '月付') return sum + cny
    if (item.cycle === '季度付') return sum + cny / 3
    if (item.cycle === '年付') return sum + cny / 12
    return sum
  }, 0)

  const yearlyTotal = list.reduce((sum, item) => {
    const multiplier = YEARLY_MULTIPLIER_MAP[item.cycle] || 1
    return sum + toCny(item.price, item.currency, rates) * multiplier
  }, 0)

  // 下月扣款预测：已停用的手动续费订阅不计；月付必计；
  // 季度付/年付仅当 displayDate 落在下个自然月计入
  const now = new Date()
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 1)
  const nextMonthTotal = Math.round(
    list.reduce((sum, item) => {
      if (item.status === 'expired') return sum
      if (item.cycle === '月付') return sum + toCny(item.price, item.currency, rates)
      const nextDate = parseDate(item.displayDate || item.nextDate)
      if (nextDate >= nextMonthStart && nextDate < nextMonthEnd) {
        return sum + toCny(item.price, item.currency, rates)
      }
      return sum
    }, 0)
  )

  return {
    monthlyTotal: Math.round(monthlyTotal),
    yearlyTotal: Math.round(yearlyTotal),
    nextMonthTotal
  }
}

export function getAnalyticsSummary(subscriptions, rates = {}) {
  const list = Array.isArray(subscriptions) ? subscriptions : []

  // 月均/年度支出（复用 getSummaryStats 的折算逻辑）
  const { monthlyTotal, yearlyTotal, nextMonthTotal } = getSummaryStats(list, rates)

  // 总支出：全部折算 CNY（避免多币种直接相加）
  const totalSpend = Math.round(list.reduce((sum, item) => sum + toCny(item.price, item.currency, rates), 0))

  // 分类支出分布（按金额降序）
  const categoryMap = list.reduce((map, item) => {
    const key = item.category || '其他'
    map[key] = (map[key] || 0) + toCny(item.price, item.currency, rates)
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
    map[key].amount += toCny(item.price, item.currency, rates)
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
    const cny = toCny(item.price, item.currency, rates)
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

  // 下月扣款预测：由 getSummaryStats 统一计算（月付必计，季/年付按 displayDate 计入）
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

// ═══ 年度账单：按订阅周期反推指定自然年 1-12 月的扣款分布 ═══

export function getYearlyBreakdown(subscriptions, rates = {}, year = new Date().getFullYear()) {
  const list = Array.isArray(subscriptions) ? subscriptions : []
  const months = []
  for (let m = 0; m < 12; m += 1) {
    months.push({
      key: `${year}-${pad(m + 1)}`,
      label: `${m + 1}月`,
      index: m,
      amount: 0
    })
  }

  list.forEach((item) => {
    if (item.status === 'expired') return
    const cycleMonths = CYCLE_MONTHS_MAP[item.cycle] || 1
    const amount = toCny(item.price, item.currency, rates)
    if (!amount) return
    const isAutoRenew = !!item.autoRenew
    const anchor = parseDate(item.displayDate || item.nextDate)
    const anchorIndex = anchor.getFullYear() * 12 + anchor.getMonth()
    months.forEach((month) => {
      const offset = anchorIndex - (year * 12 + month.index)
      if (offset % cycleMonths !== 0) return
      // 手动续费只计已发生的扣款（锚点月及之前）；自动续费估算全年
      if (!isAutoRenew && offset < 0) return
      month.amount += amount
    })
  })

  const total = months.reduce((sum, month) => sum + month.amount, 0)
  const monthlyAverage = Math.round(total / 12)
  const peakMonth = months.reduce(
    (best, month) => (month.amount > best.amount ? month : best),
    { label: '-', amount: 0 }
  )

  // TOP 订阅：按年内估算扣款总额
  const topMap = {}
  list.forEach((item) => {
    if (item.status === 'expired') return
    const cycleMonths = CYCLE_MONTHS_MAP[item.cycle] || 1
    const isAutoRenew = !!item.autoRenew
    const anchor = parseDate(item.displayDate || item.nextDate)
    const anchorIndex = anchor.getFullYear() * 12 + anchor.getMonth()
    let count = 0
    months.forEach((month) => {
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
    .map((name) => ({ name, amount: Math.round(topMap[name]) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  return {
    year,
    months,
    total: Math.round(total),
    monthlyAverage,
    peakMonth: { label: peakMonth.label, amount: Math.round(peakMonth.amount) },
    topSubscriptions
  }
}

// ═══ 月度趋势：基于当前订阅与周期反推历史实际扣款 ═══

/**
 * 生成近 N 个月（含本月）的月度支出趋势（按周期估算，非均摊）。
 * 以每条订阅的 displayDate（下一次扣款日）为锚点，往前每 cycleMonths 个月发生一次扣款；
 * 命中目标月则计入当月。已过期自动续费的订阅会把「滚动前当月已发生的扣款」正确归入历史。
 */
export function getMonthlyTrend(subscriptions, rates = {}, months = 6) {
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

  list.forEach((item) => {
    const cycleMonths = CYCLE_MONTHS_MAP[item.cycle] || 1
    const amount = toCny(item.price, item.currency, rates)
    if (!amount) return
    const anchor = parseDate(item.displayDate || item.nextDate)
    const anchorIndex = anchor.getFullYear() * 12 + anchor.getMonth()
    buckets.forEach((bucket) => {
      const offset = anchorIndex - bucket.monthIndex
      if (offset >= 0 && offset % cycleMonths === 0) bucket.amount += amount
    })
  })

  return buckets
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

export function getWeekExpense(subscriptions, rates = {}) {
  const list = Array.isArray(subscriptions) ? subscriptions : []
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((day + 6) % 7))
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  const sundayEnd = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + 1)

  let total = 0
  let count = 0
  list.forEach((item) => {
    if (item.status === 'expired') return
    const date = parseDate(item.displayDate || item.nextDate)
    if (date >= monday && date < sundayEnd) {
      total += toCny(item.price, item.currency, rates)
      count += 1
    }
  })
  return { total: Math.round(total), count }
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
  if (existingCategories.includes(trimmed)) return { ok: false, message: '该分类已存在' }
  return { ok: true, value: trimmed }
}

// 分类重命名（纯函数）：返回新列表；未变化时返回原引用
export function renameCustomCategory(categories, oldName, newName) {
  if (oldName === newName) return categories
  return categories.map((item) => (item === oldName ? newName : item))
}

// ═══ 批量导入：CSV 文本解析（纯函数）═══
// 支持两种格式：
// 1) 导出格式（含表头，9 列）：名称,金额,货币,分类,周期,下次付款日,支付方式,自动续费,备注
//    「导出数据」生成的 CSV 可直接粘贴导入，实现导出→导入闭环
// 2) 简单格式（无表头，7 列）：名称,金额,货币,周期,分类,自动续费,下次付款日
// 自动续费取值：是/否、1/0、true/false、y/n；空默认 true

const EXPORT_HEADERS = ['名称', '金额', '货币', '分类', '周期', '下次付款日', '支付方式', '自动续费', '备注']

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
    EXPORT_HEADERS.forEach((header, index) => {
      headerIndexes[header] = index
    })
  }

  const dataRows = isHeader ? rows.slice(1) : rows
  const valid = []
  const errors = []

  dataRows.forEach((fields, rowOffset) => {
    const lineNo = (isHeader ? 1 : 0) + rowOffset + 1

    let name = ''
    let price = 0
    let currency = 'CNY'
    let cycle = '月付'
    let category = '其他'
    let autoRenew = true
    let nextDate = ''
    let method = ''
    let notes = ''

    if (isHeader) {
      name = String(fields[headerIndexes['名称']] || '').trim()
      price = Number(fields[headerIndexes['金额']])
      currency = String(fields[headerIndexes['货币']] || 'CNY').trim().toUpperCase()
      category = String(fields[headerIndexes['分类']] || '').trim() || '其他'
      cycle = String(fields[headerIndexes['周期']] || '月付').trim()
      nextDate = String(fields[headerIndexes['下次付款日']] || '').trim()
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
    valid.push({
      name,
      price: Math.round(price * 100) / 100,
      currency,
      cycle,
      category,
      autoRenew,
      nextDate: nextDate && /^\d{4}-\d{2}-\d{2}$/.test(nextDate) ? nextDate : formatDateString(new Date()),
      method,
      notes
    })
  })

  return { valid, errors }
}
