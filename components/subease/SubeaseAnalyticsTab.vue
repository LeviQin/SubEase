<template>
  <scroll-view class="tab-scroll" scroll-y :show-scrollbar="false">
    <template v-if="analytics.count > 0">
      <view class="section-label">支出</view>

      <view class="metric-row">
        <view class="metric-card">
          <text class="metric-value">{{ formatCurrency(analytics.totalSpend, 'CNY', amountsHidden) }}</text>
          <text class="metric-label">总支出</text>
        </view>
        <view class="metric-card">
          <text class="metric-value">{{ formatCurrency(analytics.monthlyTotal, 'CNY', amountsHidden) }}</text>
          <text class="metric-label">月均支出</text>
        </view>
        <view class="metric-card">
          <text class="metric-value">{{ formatCurrency(analytics.yearlyTotal, 'CNY', amountsHidden) }}</text>
          <text class="metric-label">年度支出</text>
        </view>
        <view class="metric-card">
          <text class="metric-value">{{ analytics.count }}</text>
          <text class="metric-label">订阅数量</text>
        </view>
        <view class="metric-card">
          <text class="metric-value">{{ analytics.hottestCategory }}</text>
          <text class="metric-label">最高分类</text>
        </view>
        <view class="metric-card">
          <text class="metric-value">{{ formatCurrency(analytics.hottestCategoryAmount, 'CNY', amountsHidden) }}</text>
          <text class="metric-label">分类最高支出</text>
        </view>
      </view>

      <view class="section-label">下月扣款预测</view>
      <view class="next-month-card">
        <text class="next-month-value">{{ formatCurrency(analytics.nextMonthTotal, 'CNY', amountsHidden) }}</text>
        <text class="next-month-desc">月付订阅必计，季度付/年付按到期日计入</text>
      </view>

      <view class="section-label">分类支出分布</view>
      <view class="chart-card" v-if="analytics.categoryStats.length">
        <view v-for="item in analytics.categoryStats" :key="item.category" class="stat-row">
          <text class="stat-label">{{ item.category }}</text>
          <view class="stat-bar">
            <view class="stat-bar-fill" :style="{ width: `${item.percent}%` }"></view>
          </view>
          <text class="stat-value">{{ formatCurrency(item.amount, 'CNY', amountsHidden) }}</text>
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
          <text class="rank-cost">{{ formatCurrency(item.monthlyCost, 'CNY', amountsHidden) }}/月</text>
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
import { formatCurrency } from '@/utils/subease/helpers'

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
    }
  },
  methods: {
    formatCurrency
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
}

.next-month-desc {
  font-size: 22rpx;
  color: var(--text-secondary);
}

.chart-card {
  margin-bottom: 28rpx;
  padding: 28rpx 26rpx;
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
