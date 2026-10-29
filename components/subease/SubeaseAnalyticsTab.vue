<template>
  <scroll-view class="tab-scroll" scroll-y :show-scrollbar="false">
    <view v-if="loading" class="loading-state">正在计算支出数据...</view>
    <template v-else-if="analytics.count > 0">
      <view v-if="missingRates" class="data-warning">部分外币汇率暂不可用，相关金额未计入合计</view>
      <view class="section-label">支出</view>

      <view class="metric-row">
        <view class="metric-card">
          <text class="metric-value" :style="{ fontSize: amountFontSize(formatCurrency(analytics.totalSpend, 'CNY', amountsHidden), 44, 24, 7) }">{{ formatCurrency(analytics.totalSpend, 'CNY', amountsHidden) }}</text>
          <text class="metric-label">本月预计</text>
        </view>
        <view class="metric-card">
          <text class="metric-value" :style="{ fontSize: amountFontSize(formatCurrency(analytics.monthlyTotal, 'CNY', amountsHidden), 44, 24, 7) }">{{ formatCurrency(analytics.monthlyTotal, 'CNY', amountsHidden) }}</text>
          <text class="metric-label">月均预计</text>
        </view>
        <view class="metric-card">
          <text class="metric-value" :style="{ fontSize: amountFontSize(formatCurrency(analytics.yearlyTotal, 'CNY', amountsHidden), 44, 24, 7) }">{{ formatCurrency(analytics.yearlyTotal, 'CNY', amountsHidden) }}</text>
          <text class="metric-label">年度预计</text>
        </view>
        <view class="metric-card">
          <text class="metric-value" :style="{ fontSize: amountFontSize(analytics.count, 44, 24, 7) }">{{ analytics.count }}</text>
          <text class="metric-label">有效订阅</text>
        </view>
        <view class="metric-card">
          <text class="metric-value" :style="{ fontSize: amountFontSize(analytics.hottestCategory, 44, 24, 7) }">{{ analytics.hottestCategory }}</text>
          <text class="metric-label">最高分类</text>
        </view>
        <view class="metric-card">
          <text class="metric-value" :style="{ fontSize: amountFontSize(formatCurrency(analytics.hottestCategoryAmount, 'CNY', amountsHidden), 44, 24, 7) }">{{ formatCurrency(analytics.hottestCategoryAmount, 'CNY', amountsHidden) }}</text>
          <text class="metric-label">分类最高支出</text>
        </view>
      </view>

      <view class="section-label">下月扣款预测</view>
      <view class="next-month-card">
        <text class="next-month-value" :style="{ fontSize: amountFontSize(formatCurrency(analytics.nextMonthTotal, 'CNY', amountsHidden), 52, 30, 10) }">{{ formatCurrency(analytics.nextMonthTotal, 'CNY', amountsHidden) }}</text>
        <text class="next-month-desc">仅统计下个月到期且未预付的订阅</text>
      </view>

      <view class="section-label">本周支出</view>
      <view class="week-card">
        <text class="week-value" :style="{ fontSize: amountFontSize(formatCurrency(weekExpense.total, 'CNY', amountsHidden), 46, 28, 10) }">{{ formatCurrency(weekExpense.total, 'CNY', amountsHidden) }}</text>
        <text class="week-desc">{{ weekExpense.count ? `本周共 ${weekExpense.count} 笔扣款` : '本周暂无扣款计划' }}</text>
      </view>

      <view class="section-label">近 6 个月支出趋势</view>
      <view class="trend-card" v-if="monthlyTrend.length">
        <view class="trend-bars">
          <view v-for="item in monthlyTrend" :key="item.key" class="trend-bar-wrap" @click="showTrendDetail(item)">
            <text class="trend-value" :style="{ fontSize: amountFontSize(item.amount > 0 ? formatCurrency(item.amount, 'CNY', amountsHidden) : '', 20, 10, 6) }">{{ item.amount > 0 ? formatCurrency(item.amount, 'CNY', amountsHidden) : '' }}</text>
            <view class="trend-bar-track">
              <view
                class="trend-bar-fill"
                :class="{ 'is-zero': item.amount === 0 }"
                :style="{ height: trendBarHeight(item.amount) }"
              ></view>
            </view>
            <text class="trend-label">{{ item.shortLabel }}</text>
          </view>
        </view>
        <text class="trend-note">按订阅周期估算（含本月未到期扣款），点击柱子查看详情</text>
      </view>

      <view class="section-label">分类月均支出</view>
      <view class="chart-card" v-if="analytics.categoryStats.length">
        <view v-for="item in analytics.categoryStats" :key="item.category" class="stat-row">
          <text class="stat-label">{{ item.category }}</text>
          <view class="stat-bar">
            <view class="stat-bar-fill" :style="{ width: `${item.percent}%` }"></view>
          </view>
          <text class="stat-value" :style="{ fontSize: amountFontSize(formatCurrency(item.amount, 'CNY', amountsHidden), 24, 14, 7) }">{{ formatCurrency(item.amount, 'CNY', amountsHidden) }}</text>
        </view>
      </view>

      <view class="section-label">周期分布</view>
      <view class="chart-card" v-if="analytics.cycleStats.length">
        <view v-for="item in analytics.cycleStats" :key="item.cycle" class="stat-row">
          <text class="stat-label">{{ item.cycle }}</text>
          <view class="stat-bar stat-bar--gold">
            <view class="stat-bar-fill stat-bar-fill--gold" :style="{ width: `${item.percent}%` }"></view>
          </view>
          <text class="stat-value">{{ item.count }} 笔</text>
        </view>
      </view>

      <view class="section-label">高消费排行</view>
      <view class="chart-card" v-if="analytics.topSpenders.length">
        <view v-for="(item, index) in analytics.topSpenders" :key="index" class="rank-row">
          <text :class="['rank-index', index < 3 ? 'is-top' : '']">{{ index + 1 }}</text>
          <text class="rank-name">{{ item.name }}</text>
          <text class="rank-cost" :style="{ fontSize: amountFontSize(formatCurrency(item.monthlyCost, 'CNY', amountsHidden) + '/月', 24, 14, 7) }">{{ formatCurrency(item.monthlyCost, 'CNY', amountsHidden) }}/月</text>
        </view>
      </view>
    </template>

    <view class="empty-chart" v-else>
      <text class="empty-title">暂无支出数据</text>
      <text class="empty-desc">添加订阅后，这里会展示支出分析与统计图表。</text>
    </view>
  </scroll-view>
</template>

<script>
import { formatCurrency, getAdaptiveAmountFontSize } from '@/utils/subease/helpers'

export default {
  name: 'SubeaseAnalyticsTab',
  props: {
    analytics: {
      type: Object,
      default: () => ({
        totalSpend: 0,
        monthlyTotal: 0,
        yearlyTotal: 0,
        count: 0,
        hottestCategory: '暂无',
        hottestCategoryAmount: 0,
        categoryStats: [],
        cycleStats: [],
        topSpenders: [],
        nextMonthTotal: 0
      })
    },
    amountsHidden: {
      type: Boolean,
      default: false
    },
    monthlyTrend: {
      type: Array,
      default: () => []
    },
    weekExpense: {
      type: Object,
      default: () => ({ total: 0, count: 0 })
    },
    loading: {
      type: Boolean,
      default: false
    },
    missingRates: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    formatCurrency,
    amountFontSize(value, maxSize, minSize, maxChars) {
      return getAdaptiveAmountFontSize(value, maxSize, minSize, maxChars)
    },
    trendBarHeight(amount) {
      const max = Math.max(...this.monthlyTrend.map((item) => Number(item.amount) || 0), 0)
      if (!amount || !max) return '6%'
      const ratio = Math.max(Number(amount) / max, 0.08)
      return `${Math.round(ratio * 100)}%`
    },
    showTrendDetail(item) {
      // 小程序无 hover，点击柱子弹出当月精确金额
      uni.showModal({
        title: item.label,
        content: `支出 ${formatCurrency(item.amount, 'CNY', this.amountsHidden)}`,
        showCancel: false,
        confirmText: '知道了'
      })
    }
  }
}
</script>

<style scoped lang="scss">
.tab-scroll {
  height: 100%;
  padding: 32rpx var(--page-gutter) var(--content-bottom-space);
}

.section-label {
  margin: 0 0 16rpx;
  font-size: 20rpx;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 1.2rpx;
}

.loading-state,
.data-warning {
  margin-bottom: 24rpx;
  padding: 24rpx 28rpx;
  border-radius: var(--radius-control);
  font-size: 24rpx;
  line-height: 1.5;
}

.loading-state {
  color: var(--text-secondary);
  background: var(--bg-elevated);
}

.data-warning {
  color: var(--warning);
  background: var(--warning-light);
}

.metric-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 28rpx;
}

.metric-card:nth-child(3n+1) {
  margin: 0 9rpx 18rpx 0;
}

.metric-card:nth-child(3n+2) {
  margin: 0 9rpx 18rpx;
}

.metric-card:nth-child(3n) {
  margin: 0 0 18rpx 9rpx;
}

.metric-card,
.chart-card {
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.metric-card {
  padding: 30rpx 24rpx;
}

.metric-value {
  display: block;
  margin-bottom: 8rpx;
  font-size: 44rpx;
  font-weight: 700;
  letter-spacing: -1rpx;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
  white-space: nowrap;
  overflow: visible;
}

.metric-label {
  font-size: 21rpx;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.9rpx;
}

.next-month-card {
  padding: 34rpx 30rpx;
  background: linear-gradient(135deg, rgba(87, 112, 255, 0.12), rgba(87, 112, 255, 0.04));
  border: 1px solid var(--separator);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  margin-bottom: 28rpx;
}

.next-month-value {
  display: block;
  margin-bottom: 10rpx;
  font-size: 52rpx;
  font-weight: 700;
  letter-spacing: -1rpx;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
  white-space: nowrap;
  overflow: visible;
}

.next-month-desc {
  font-size: 22rpx;
  color: var(--text-secondary);
}

.week-card {
  margin-bottom: 28rpx;
  padding: 30rpx 30rpx;
  background: linear-gradient(135deg, rgba(52, 199, 89, 0.1), rgba(52, 199, 89, 0.03));
  border: 1px solid var(--separator);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.week-value {
  display: block;
  margin-bottom: 8rpx;
  font-size: 46rpx;
  font-weight: 700;
  letter-spacing: -1rpx;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
  white-space: nowrap;
  overflow: visible;
}

.week-desc {
  font-size: 22rpx;
  color: var(--text-secondary);
}

.chart-card {
  margin-bottom: 28rpx;
  padding: 28rpx 26rpx;
}

.trend-card {
  margin-bottom: 28rpx;
  padding: 32rpx 26rpx 24rpx;
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.trend-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 260rpx;
}

.trend-bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  min-width: 0;
}

.trend-value {
  height: 34rpx;
  font-size: 20rpx;
  font-weight: 500;
  color: var(--text-secondary);
  line-height: 34rpx;
  white-space: nowrap;
  overflow: visible;
}

.trend-bar-track {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 36rpx;
  height: 200rpx;
  margin-top: 6rpx;
  border-radius: 999rpx;
  background: var(--bg-muted);
  overflow: hidden;
}

.trend-bar-fill {
  width: 100%;
  border-radius: 999rpx;
  background: linear-gradient(180deg, rgba(87, 112, 255, 0.95), rgba(87, 112, 255, 0.5));
  transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.trend-bar-fill.is-zero {
  background: var(--bg-muted);
}

.trend-label {
  margin-top: 10rpx;
  font-size: 20rpx;
  color: var(--text-tertiary);
}

.trend-note {
  display: block;
  margin-top: 16rpx;
  font-size: 21rpx;
  color: var(--text-quaternary);
}

.stat-row {
  display: grid;
  grid-template-columns: 108rpx 1fr 150rpx;
  gap: 16rpx;
  align-items: center;
  margin-bottom: 22rpx;
}

.stat-row:last-child {
  margin-bottom: 0;
}

.stat-label {
  font-size: 24rpx;
  color: var(--text-primary);
}

.stat-bar {
  height: 16rpx;
  overflow: hidden;
  background: rgba(87, 112, 255, 0.08);
  border-radius: 999rpx;
}

.stat-bar--gold {
  background: rgba(255, 158, 46, 0.1);
}

.stat-bar-fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, rgba(87, 112, 255, 0.9), rgba(87, 112, 255, 0.45));
}

.stat-bar-fill--gold {
  background: linear-gradient(90deg, rgba(255, 158, 46, 0.9), rgba(255, 158, 46, 0.45));
}

.stat-value {
  font-size: 24rpx;
  font-weight: 600;
  text-align: right;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: visible;
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
  width: 44rpx;
  height: 44rpx;
  margin-right: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  font-size: 24rpx;
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--bg-muted);
  border-radius: 50%;
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

.rank-cost {
  flex: none;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: visible;
}

.empty-chart {
  padding: 120rpx 32rpx;
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-card);
  text-align: center;
  box-shadow: var(--shadow-card);
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
