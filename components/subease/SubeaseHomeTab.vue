<template>
  <scroll-view class="tab-scroll" scroll-y :show-scrollbar="false">
    <view class="section-label">总览</view>
    <view class="hero-card">
      <view class="hero-side">
        <text class="hero-amount">{{ formatCurrency(summary.monthlyTotal, 'CNY', amountsHidden) }}</text>
        <text class="hero-desc">本月支出</text>
      </view>
      <view class="hero-divider"></view>
      <view class="hero-side">
        <text class="hero-amount">{{ formatCurrency(summary.yearlyTotal, 'CNY', amountsHidden) }}</text>
        <text class="hero-desc">年度支出</text>
      </view>
      <view class="hero-glow"></view>
    </view>

    <view class="hero-toggle">
      <text class="hero-toggle-text" @click="$emit('toggle-amount')">
        {{ amountsHidden ? '显示金额' : '隐藏金额' }}
      </text>
    </view>

    <view class="section-label">近期待付</view>
    <view v-if="upcomingList.length" class="upcoming-card">
      <view
        v-for="item in upcomingList"
        :key="item.id"
        class="upcoming-item"
        @click="$emit('open-detail', item.id)"
      >
        <view :class="['dot', item.days <= 3 ? 'dot-warning' : 'dot-normal']"></view>
        <view class="item-main">
          <text class="item-name">{{ item.name }}</text>
          <text class="item-meta">{{ formatCurrency(item.price, item.currency) }} · {{ item.cycle }}</text>
        </view>
        <text :class="['item-countdown', item.days <= 3 ? 'is-warning' : '']">
          {{ item.days === 0 ? '今天到期' : `剩余 ${item.days} 天` }}
        </text>
      </view>
    </view>

    <view v-else class="empty-state">
      <text class="empty-title">没有待付账单</text>
      <text class="empty-desc">近期无需操作，一切正常。</text>
    </view>

    <button class="primary-button" @click="$emit('open-add')">+ 添加订阅</button>
  </scroll-view>
</template>

<script>
import { formatCurrency } from '@/utils/subease/helpers'

export default {
  name: 'SubeaseHomeTab',
  props: {
    summary: {
      type: Object,
      default: () => ({ monthlyTotal: 0, yearlyTotal: 0 })
    },
    upcomingList: {
      type: Array,
      default: () => []
    },
    amountsHidden: {
      type: Boolean,
      default: false
    }
  },
  emits: ['open-add', 'toggle-amount', 'open-detail'],
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
  margin-bottom: 16rpx;
  font-size: 20rpx;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 1.2rpx;
}

.hero-card {
  position: relative;
  display: flex;
  align-items: center;
  overflow: hidden;
  margin-bottom: 22rpx;
  padding: 44rpx 32rpx;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 250, 252, 0.98));
  border: 1px solid var(--separator);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
}

.hero-side {
  position: relative;
  z-index: 1;
  flex: 1;
  text-align: center;
}

.hero-amount {
  display: block;
  margin-bottom: 8rpx;
  font-size: 58rpx;
  font-weight: 700;
  letter-spacing: -1.2rpx;
  color: var(--text-primary);
}

.hero-desc {
  font-size: 24rpx;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.8rpx;
}

.hero-divider {
  position: relative;
  z-index: 1;
  width: 2rpx;
  height: 88rpx;
  background: var(--separator);
}

.hero-glow {
  position: absolute;
  top: -50rpx;
  right: -34rpx;
  width: 220rpx;
  height: 220rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(87, 112, 255, 0.14), rgba(87, 112, 255, 0));
}

.hero-toggle {
  display: flex;
  justify-content: flex-end;
  margin: -2rpx 0 32rpx;
}

.hero-toggle-text {
  font-size: 23rpx;
  font-weight: 600;
  color: var(--accent);
  padding: 8rpx 0;
}

.upcoming-card {
  margin-bottom: 32rpx;
  padding: 0 28rpx;
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.upcoming-item {
  display: flex;
  align-items: center;
  min-height: 116rpx;
  border-bottom: 1px solid var(--separator);
}

.upcoming-item .dot {
  margin-right: 22rpx;
}

.upcoming-item .item-main {
  margin-right: 22rpx;
}

.upcoming-item:last-child {
  border-bottom: 0;
}

.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-warning {
  background: var(--warning);
  box-shadow: 0 0 0 6rpx rgba(255, 159, 10, 0.14);
}

.dot-normal {
  background: var(--text-quaternary);
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-name {
  display: block;
  margin-bottom: 4rpx;
  font-size: 29rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.item-meta {
  font-size: 23rpx;
  color: var(--text-secondary);
}

.item-countdown {
  font-size: 23rpx;
  font-weight: 600;
  color: var(--text-secondary);
}

.item-countdown.is-warning {
  color: var(--warning);
}

.empty-state {
  margin-bottom: 32rpx;
  padding: 80rpx 32rpx;
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

.primary-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100rpx;
  border: none;
  border-radius: var(--radius-control);
  background: var(--accent);
  color: var(--text-inverse);
  font-size: 29rpx;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.2rpx;
  box-shadow: var(--shadow-raised);
}

.primary-button:active {
  transform: scale(0.98);
  box-shadow: var(--shadow-card);
}
</style>
