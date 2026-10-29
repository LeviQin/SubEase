<template>
  <view class="annual-page">
    <view v-if="loading" class="loading">正在生成年度账单...</view>
    <template v-else-if="report">
      <view v-if="missingRates" class="data-warning">部分外币汇率暂不可用，相关金额未计入报告</view>
      <view v-if="estimatedData" class="data-warning data-warning--estimate">部分月份仍按订阅周期估算；记录付款后会逐步转为真实统计</view>
      <view class="hero">
        <text class="hero-year">{{ report.year }}</text>
        <text class="hero-title">年度订阅账单</text>
        <text class="hero-amount" :style="{ fontSize: amountFontSize(formatCurrency(report.total, 'CNY'), 88, 44, 10) }">{{ formatCurrency(report.total, 'CNY') }}</text>
        <text class="hero-desc">全年订阅支出{{ estimatedData ? '（含周期估算）' : '（按真实付款记录）' }}</text>
      </view>

      <view class="metric-row">
        <view class="metric-card">
          <text class="metric-value" :style="{ fontSize: amountFontSize(formatCurrency(report.monthlyAverage, 'CNY'), 36, 22, 7) }">{{ formatCurrency(report.monthlyAverage, 'CNY') }}</text>
          <text class="metric-label">月均支出</text>
        </view>
        <view class="metric-card">
          <text class="metric-value">{{ report.peakMonth.label }}</text>
          <text class="metric-label">支出最高月份</text>
        </view>
        <view class="metric-card">
          <text class="metric-value" :style="{ fontSize: amountFontSize(formatCurrency(report.peakMonth.amount, 'CNY'), 36, 22, 7) }">{{ formatCurrency(report.peakMonth.amount, 'CNY') }}</text>
          <text class="metric-label">最高月支出</text>
        </view>
      </view>

      <view class="section-label">月度支出分布</view>
      <view class="chart-card">
        <view class="chart-bars">
          <view v-for="month in report.months" :key="month.key" class="chart-bar-wrap" @click="showMonthDetail(month)">
            <text
              class="chart-value"
              :style="{ fontSize: chartValueFontSize(month.amount) }"
            >{{ month.amount > 0 ? formatCurrency(month.amount, 'CNY') : '' }}</text>
            <view class="chart-bar-track">
              <view
                class="chart-bar-fill"
                :class="{ 'is-zero': month.amount === 0 }"
                :style="{ height: barHeight(month.amount) }"
              ></view>
            </view>
            <text class="chart-label">{{ month.label }}</text>
          </view>
        </view>
      </view>

      <template v-if="budgetMonths.length">
        <view class="section-label">预算对照</view>
        <view class="budget-report-card">
          <view v-for="item in budgetMonths" :key="item.key" class="budget-report-row">
            <view class="budget-report-main">
              <text class="budget-report-month">{{ item.label }}</text>
              <text v-if="item.budgetStatus.estimatedData" class="budget-report-note">含周期估算</text>
            </view>
            <view class="budget-report-values">
              <text class="budget-report-amount">{{ formatCurrency(item.amount, 'CNY') }} / {{ formatCurrency(item.budgetCny, 'CNY') }}</text>
              <text :class="['budget-report-status', item.budgetStatus.over ? 'is-over' : item.budgetStatus.warning ? 'is-warning' : '']">{{ budgetStatusLabel(item) }}</text>
            </view>
          </view>
        </view>
      </template>

      <view class="section-label">年度 TOP 订阅</view>
      <view class="rank-card" v-if="report.topSubscriptions.length">
        <view v-for="(item, index) in report.topSubscriptions" :key="item.name" class="rank-row">
          <text :class="['rank-index', index < 3 ? 'is-top' : '']">{{ index + 1 }}</text>
          <text class="rank-name">{{ item.name }}</text>
          <text class="rank-amount" :style="{ fontSize: amountFontSize(formatCurrency(item.amount, 'CNY'), 24, 14, 7) }">{{ formatCurrency(item.amount, 'CNY') }}</text>
        </view>
      </view>
      <view v-else class="rank-empty">暂无订阅数据</view>

      <view class="share-tip">右上角菜单可将这份账单分享给朋友</view>
    </template>

    <view v-else class="empty">
      <text class="empty-title">暂无数据</text>
      <text class="empty-desc">添加订阅后，这里会生成你的年度账单报告。</text>
    </view>
  </view>
</template>

<script>
import {
  formatCurrency as formatMoney,
  getAdaptiveAmountFontSize,
  getBudgetReview,
  normalizeSubscriptions,
  getYearlyBreakdown,
  hasMissingRates
} from '@/utils/subease/helpers'
import {
  loadSubscriptionsCache,
  loadRatesCache,
  loadAmountsHidden,
  saveRatesCache,
  loadPaymentRecordsCache
} from '@/utils/subease/cache'
import { getCurrencyRates } from '@/api/subease/rates'
import { getMonthlyBudgets } from '@/api/subease/auth'
import { getPaymentRecords } from '@/api/subease/subscription'

export default {
  data() {
    return {
      report: null,
      loading: true,
      amountsHidden: loadAmountsHidden(),
      missingRates: false,
      estimatedData: false,
      budgetReview: []
    }
  },
  computed: {
    budgetMonths() {
      return this.budgetReview.filter((item) => item.budgetStatus.enabled)
    }
  },
  onLoad() {
    this.buildReport()
  },
  onShareAppMessage() {
    const year = this.report ? this.report.year : new Date().getFullYear()
    return {
      title: this.amountsHidden
        ? `我的 ${year} 年订阅账单`
        : `我 ${year} 年在订阅上花了 ${this.report ? formatMoney(this.report.total, 'CNY') : '¥0'}，你呢？`,
      path: '/pages/index/index'
    }
  },
  onShareTimeline() {
    const year = this.report ? this.report.year : new Date().getFullYear()
    return {
      title: this.amountsHidden
        ? `${year} 年订阅账单`
        : `${year} 订阅账单：我花了 ${this.report ? formatMoney(this.report.total, 'CNY') : '¥0'}`
    }
  },
  methods: {
    formatCurrency(price, currency) {
      return formatMoney(price, currency, this.amountsHidden)
    },
    amountFontSize(value, maxSize, minSize, maxChars) {
      return getAdaptiveAmountFontSize(value, maxSize, minSize, maxChars)
    },
    chartValueFontSize(amount) {
      return getAdaptiveAmountFontSize(this.formatCurrency(amount, 'CNY'), 18, 8, 5)
    },
    budgetStatusLabel(item) {
      if (item.budgetStatus.over) return `超支 ${this.formatCurrency(item.budgetStatus.overAmount, 'CNY')}`
      if (item.budgetStatus.warning) return `已用 ${item.budgetStatus.percent}%`
      return `余 ${this.formatCurrency(item.budgetStatus.remaining, 'CNY')}`
    },
    async buildReport() {
      try {
        const cached = loadSubscriptionsCache()
        if (!cached || !cached.length) {
          this.report = null
          return
        }
        let rates = loadRatesCache()
        if (!rates) {
          try {
            rates = await getCurrencyRates()
            rates = rates || {}
            saveRatesCache(rates)
          } catch {
            rates = {}
          }
        }
        const normalized = normalizeSubscriptions(cached)
        const year = new Date().getFullYear()
        let paymentRecords = loadPaymentRecordsCache() || []
        try {
          const remoteRecords = await getPaymentRecords()
          if (Array.isArray(remoteRecords)) paymentRecords = remoteRecords
        } catch (error) {
          console.warn('[AnnualReport] 获取付款历史失败，使用缓存', error.message)
        }
        this.missingRates = hasMissingRates(normalized, rates || {}, paymentRecords)
        const report = getYearlyBreakdown(normalized, rates, year, paymentRecords)
        let budgets = []
        try {
          const budgetData = await getMonthlyBudgets({ from: `${year}-01`, to: `${year}-12` })
          budgets = Array.isArray(budgetData?.budgets) ? budgetData.budgets : []
        } catch (error) {
          console.warn('[AnnualReport] 获取预算历史失败，继续生成账单', error.message)
        }
        this.budgetReview = getBudgetReview(report.months, budgets, Boolean(report.estimatedData))
        this.report = report
        this.estimatedData = Boolean(this.report.estimatedData)
      } catch (error) {
        console.error('[AnnualReport] 生成年度报告失败', error)
        this.report = null
      } finally {
        this.loading = false
      }
    },
    barHeight(amount) {
      const max = Math.max(...this.report.months.map((m) => Number(m.amount) || 0), 0)
      if (!amount || !max) return '8%'
      const ratio = Math.max(Number(amount) / max, 0.1)
      return `${Math.round(ratio * 100)}%`
    },
    showMonthDetail(month) {
      uni.showModal({
        title: month.label,
        content: this.amountsHidden ? '金额已隐藏' : `支出 ${formatMoney(month.amount, 'CNY')}`,
        showCancel: false,
        confirmText: '知道了'
      })
    }
  }
}
</script>

<style scoped lang="scss">
.annual-page {
  min-height: 100vh;
  padding: 40rpx 36rpx calc(60rpx + env(safe-area-inset-bottom, 0px));
  background: var(--app-bg);
  box-sizing: border-box;
}

.loading,
.data-warning {
  padding: 28rpx;
  border-radius: var(--radius-control);
  font-size: 25rpx;
  line-height: 1.5;
}

.loading {
  color: var(--text-secondary);
  background: var(--bg-elevated);
}

.data-warning {
  margin-bottom: 24rpx;
  color: var(--warning);
  background: var(--warning-light);
}

.data-warning--estimate {
  color: var(--text-secondary);
  background: var(--bg-muted);
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 32rpx 44rpx;
  margin-bottom: 28rpx;
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
}

.hero-year {
  font-size: 26rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
  color: var(--accent);
}

.hero-title {
  margin-top: 10rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.hero-amount {
  margin-top: 22rpx;
  font-size: 88rpx;
  font-weight: 700;
  letter-spacing: -2rpx;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: visible;
}

.hero-desc {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--text-tertiary);
}

.metric-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.metric-card {
  padding: 28rpx 20rpx;
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  text-align: center;
}

.metric-value {
  display: block;
  margin-bottom: 10rpx;
  font-size: 36rpx;
  font-weight: 700;
  letter-spacing: -1rpx;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: visible;
}

.metric-label {
  font-size: 21rpx;
  color: var(--text-secondary);
}

.section-label {
  margin: 0 0 16rpx;
  font-size: 20rpx;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 1.2rpx;
}

.chart-card,
.rank-card {
  margin-bottom: 32rpx;
  padding: 32rpx 24rpx 24rpx;
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 300rpx;
}

.chart-bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  min-width: 0;
}

.chart-value {
  height: 30rpx;
  font-size: 18rpx;
  font-weight: 500;
  color: var(--text-secondary);
  line-height: 30rpx;
  white-space: nowrap;
  overflow: visible;
  text-align: center;
}

.chart-bar-track {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 30rpx;
  height: 220rpx;
  margin-top: 6rpx;
  border-radius: 999rpx;
  background: var(--bg-muted);
  overflow: hidden;
}

.chart-bar-fill {
  width: 100%;
  border-radius: 999rpx;
  background: linear-gradient(180deg, rgba(87, 112, 255, 0.95), rgba(87, 112, 255, 0.5));
}

.chart-bar-fill.is-zero {
  background: var(--bg-muted);
}

.chart-label {
  margin-top: 10rpx;
  font-size: 18rpx;
  color: var(--text-tertiary);
}

.budget-report-card {
  margin-bottom: 32rpx;
  padding: 6rpx 24rpx;
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.budget-report-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 84rpx;
  padding: 14rpx 0;
  border-bottom: 1px solid var(--separator);
}

.budget-report-row:last-child {
  border-bottom: 0;
}

.budget-report-main,
.budget-report-values {
  display: flex;
  flex-direction: column;
}

.budget-report-month {
  font-size: 25rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.budget-report-note {
  margin-top: 6rpx;
  font-size: 20rpx;
  color: var(--text-tertiary);
}

.budget-report-values {
  align-items: flex-end;
  margin-left: 20rpx;
}

.budget-report-amount,
.budget-report-status {
  white-space: nowrap;
}

.budget-report-amount {
  font-size: 23rpx;
  color: var(--text-secondary);
}

.budget-report-status {
  margin-top: 6rpx;
  font-size: 21rpx;
  color: var(--accent);
}

.budget-report-status.is-warning {
  color: var(--warning);
}

.budget-report-status.is-over {
  color: var(--danger);
}

.rank-row {
  display: flex;
  align-items: center;
  margin-bottom: 22rpx;
}

.rank-row:last-child {
  margin-bottom: 0;
}

.rank-index {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 44rpx;
  height: 44rpx;
  margin-right: 20rpx;
  border-radius: 50%;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--bg-muted);
}

.rank-index.is-top {
  color: #ffffff;
  background: var(--accent);
}

.rank-name {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  color: var(--text-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.rank-amount {
  flex: none;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: visible;
}

.rank-empty {
  padding: 40rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: var(--text-tertiary);
}

.share-tip {
  margin-top: 8rpx;
  text-align: center;
  font-size: 22rpx;
  color: var(--text-quaternary);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 40rpx;
  text-align: center;
}

.empty-title {
  display: block;
  margin-bottom: 12rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.empty-desc {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--text-secondary);
}
</style>
