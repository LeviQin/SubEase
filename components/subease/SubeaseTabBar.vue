<template>
  <view class="tab-bar">
    <view
      v-for="item in items"
      :key="item.key"
      :class="['tab-item', activeTab === item.key ? 'is-active' : '']"
      @click="$emit('change', item.key)"
    >
      <view :class="['tab-icon', `tab-icon-${item.key}`]"></view>
      <text class="tab-label">{{ item.label }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'SubeaseTabBar',
  props: {
    activeTab: {
      type: String,
      default: 'home'
    }
  },
  emits: ['change'],
  data() {
    return {
      items: [
        { key: 'home', label: '首页' },
        { key: 'subscriptions', label: '订阅' },
        { key: 'analytics', label: '分析' },
        { key: 'profile', label: '我的' }
      ]
    }
  }
}
</script>

<style scoped lang="scss">
.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-around;
  padding: 12rpx 24rpx calc(24rpx + env(safe-area-inset-bottom, 0px));
  background: var(--frosted-surface);
  border-top: 1px solid var(--separator);
  box-shadow:
    0 -8rpx 24rpx rgba(28, 28, 30, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.68);
  backdrop-filter: saturate(180%) blur(24rpx);
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120rpx;
  padding: 14rpx 18rpx 10rpx;
  color: var(--text-tertiary);
  position: relative;
  border-radius: var(--radius-sm);
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    transform var(--transition-fast);
}

.tab-item.is-active {
  color: var(--accent);
  background: rgba(87, 112, 255, 0.1);
}

.tab-item:active {
  background: var(--bg-muted);
  transform: scale(0.98);
}

.tab-icon {
  width: 42rpx;
  height: 42rpx;
  margin-bottom: 6rpx;
  background-color: currentColor;
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  transition: opacity 0.2s;
}

/* ===== 首页 - 房屋 ===== */
.tab-icon-home {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath d='M6 20L24 6l18 14' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M10 18v24h28V18' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M18 42V28h12v14' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cpath d='M6 20L24 6l18 14' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M10 18v24h28V18' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M18 42V28h12v14' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}

/* ===== 订阅 - 文档列表 ===== */
.tab-icon-subscriptions {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect x='10' y='6' width='28' height='36' rx='4' fill='none' stroke='black' stroke-width='3'/%3E%3Cline x1='16' y1='16' x2='32' y2='16' stroke='black' stroke-width='3' stroke-linecap='round'/%3E%3Cline x1='16' y1='24' x2='32' y2='24' stroke='black' stroke-width='3' stroke-linecap='round'/%3E%3Cline x1='16' y1='32' x2='24' y2='32' stroke='black' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect x='10' y='6' width='28' height='36' rx='4' fill='none' stroke='black' stroke-width='3'/%3E%3Cline x1='16' y1='16' x2='32' y2='16' stroke='black' stroke-width='3' stroke-linecap='round'/%3E%3Cline x1='16' y1='24' x2='32' y2='24' stroke='black' stroke-width='3' stroke-linecap='round'/%3E%3Cline x1='16' y1='32' x2='24' y2='32' stroke='black' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E");
}

/* ===== 分析 - 柱状图 ===== */
.tab-icon-analytics {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cline x1='8' y1='42' x2='40' y2='42' stroke='black' stroke-width='3' stroke-linecap='round'/%3E%3Crect x='11' y='22' width='7' height='20' rx='2' fill='none' stroke='black' stroke-width='3'/%3E%3Crect x='21' y='14' width='7' height='28' rx='2' fill='none' stroke='black' stroke-width='3'/%3E%3Crect x='31' y='26' width='7' height='16' rx='2' fill='none' stroke='black' stroke-width='3'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Cline x1='8' y1='42' x2='40' y2='42' stroke='black' stroke-width='3' stroke-linecap='round'/%3E%3Crect x='11' y='22' width='7' height='20' rx='2' fill='none' stroke='black' stroke-width='3'/%3E%3Crect x='21' y='14' width='7' height='28' rx='2' fill='none' stroke='black' stroke-width='3'/%3E%3Crect x='31' y='26' width='7' height='16' rx='2' fill='none' stroke='black' stroke-width='3'/%3E%3C/svg%3E");
}

/* ===== 我的 - 人物 ===== */
.tab-icon-profile {
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Ccircle cx='24' cy='16' r='8' fill='none' stroke='black' stroke-width='3'/%3E%3Cpath d='M8 42c0-12 7.2-18 16-18s16 6 16 18' fill='none' stroke='black' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Ccircle cx='24' cy='16' r='8' fill='none' stroke='black' stroke-width='3'/%3E%3Cpath d='M8 42c0-12 7.2-18 16-18s16 6 16 18' fill='none' stroke='black' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E");
}

.tab-label {
  font-size: 20rpx;
  font-weight: 600;
  letter-spacing: 0.1rpx;
}
</style>
