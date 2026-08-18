<template>
  <view class="annual-page">
    <template v-if="report">
      <view class="hero">
        <text class="hero-year">{{ report.year }}</text>
        <text class="hero-title">年度订阅账单</text>
        <text class="hero-amount">{{ formatCurrency(report.total, 'CNY') }}</text>
        <text class="hero-desc">全年订阅支出（按周期估算）</text>
      </view>

      <view class="metric-row">
        <view class="metric-card">
          <text class="metric-value">{{ formatCurrency(report.monthlyAverage, 'CNY') }}</text>
          <text class="metric-label">月均支出</text>
        </view>
        <view class="metric-card">
          <text class="metric-value">{{ report.peakMonth.label }}</text>
          <text class="metric-label">支出最高月份</text>
        </view>
        <view class="metric-card">
          <text class="metric-value">{{ formatCurrency(report.peakMonth.amount, 'CNY') }}</text>
          <text class="metric-label">最高月支出</text>
        </view>
      </view>

      <view class="section-label">月度支出分布</view>
      <view class="chart-card">
        <view class="chart-bars">
          <view v-for="month in report.months" :key="month.key" class="chart-bar-wrap">
            <text class="chart-value">{{ month.amount > 0 ? formatCurrency(month.amount, 'CNY') : '' }}</text>
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

      <view class="section-label">年度 TOP 订阅</view>
      <view class="rank-card" v-if="report.topSubscriptions.length">
        <view v-for="(item, index) in report.topSubscriptions" :key="item.name" class="rank-row">
          <text :class="['rank-index', index < 3 ? 'is-top' : '']">{{ index + 1 }}</text>
          <text class="rank-name">{{ item.name }}</text>
          <text class="rank-amount">{{ formatCurrency(item.amount, 'CNY') }}</text>
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
import { formatCurrency, normalizeSubscriptions, getYearlyBreakdown } from '@/utils/subease/helpers'
import { loadSubscriptionsCache, loadRatesCache } from '@/utils/subease/cache'

export default {
  data() {
    return {
      report: null,
      loading: true
    }
  },
  onLoad() {
    this.buildReport()
  },
  onShareAppMessage() {
    const year = this.report ? this.report.year : new Date().getFullYear()
    const total = this.report ? formatCurrency(this.report.total, 'CNY') : '¥0'
    return {
      title: `我 ${year} 年在订阅上花了 ${total}，你呢？`,
      path: '/pages/index/index'
    }
  },
  onShareTimeline() {
    const year = this.report ? this.report.year : new Date().getFullYear()
    const total = this.report ? formatCurrency(this.report.total, 'CNY') : '¥0'
    return {
      title: `${year} 订阅账单：我花了 ${total}`
    }
  },
  methods: {
    formatCurrency,
    buildReport() {
      try {
        const cached = loadSubscriptionsCache()
        const rates = loadRatesCache() || {}
        if (!cached || !cached.length) {
          this.report = null
          return
        }
        const normalized = normalizeSubscriptions(cached)
        this.report = getYearlyBreakdown(normalized, rates)
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
