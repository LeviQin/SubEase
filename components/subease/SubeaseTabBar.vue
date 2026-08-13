<template>
  <view class="tab-bar">
    <view
      v-for="item in displayItems"
      :key="item.key"
      :class="item.type === 'add'
        ? 'tab-add-wrapper'
        : ['tab-item', activeTab === item.key ? 'is-active' : '']"
      @click="handleClick(item)"
    >
      <view v-if="item.type === 'add'" class="tab-add-button">
        <view class="tab-add-icon"></view>
      </view>

      <template v-else>
        <view :class="['tab-icon', `tab-icon-${item.key}`]"></view>
        <view v-if="item.key === 'home' && soonCount > 0" class="tab-badge">{{ soonCount > 9 ? '9+' : soonCount }}</view>
        <text class="tab-label">{{ item.label }}</text>
      </template>
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
    },
    soonCount: {
      type: Number,
      default: 0
    }
  },
  emits: ['change', 'add'],
  data() {
    return {
      items: [
        { key: 'home', label: '首页' },
        { key: 'subscriptions', label: '订阅' },
        { key: 'analytics', label: '分析' },
        { key: 'profile', label: '我的' }
      ]
    }
  },
  computed: {
    displayItems() {
      const [home, subscriptions, analytics, profile] = this.items
      return [
        home,
        subscriptions,
        { key: 'add', type: 'add' },
        analytics,
        profile
      ]
    }
  },
  methods: {
    handleClick(item) {
      if (item.type === 'add') {
        this.$emit('add')
        return
      }
      this.$emit('change', item.key)
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
  z-index: 20;
  display: flex;
  align-items: flex-start;
  justify-content: space-around;
  overflow: visible;
  padding: 12rpx 24rpx calc(24rpx + env(safe-area-inset-bottom, 0px));
  background: var(--frosted-surface);
  border-top: 1px solid var(--separator);
  box-shadow: 0 -8rpx 24rpx rgba(28, 28, 30, 0.04);
  backdrop-filter: saturate(180%) blur(24rpx);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  padding: 14rpx 18rpx 10rpx;
  color: var(--text-tertiary);
  position: relative;
  border-radius: var(--radius-sm);
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    transform var(--transition-fast);
}

.tab-add-wrapper {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8rpx;
}

.tab-add-button {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 112rpx;
  height: 112rpx;
  margin-top: -36rpx;
  border-radius: 50%;
  background: linear-gradient(180deg, #6d83ff, var(--accent));
  border: 1px solid rgba(255, 255, 255, 0.42);
  box-shadow:
    0 16rpx 32rpx rgba(87, 112, 255, 0.18),
    0 6rpx 12rpx rgba(15, 23, 42, 0.08);
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}

.tab-add-button:active {
  transform: scale(0.92);
  box-shadow: var(--shadow-card);
}

.tab-add-icon {
  width: 46rpx;
  height: 46rpx;
  background-color: #fff;
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cline x1='12' y1='5' x2='12' y2='19' stroke='black' stroke-width='2.5' stroke-linecap='round'/%3E%3Cline x1='5' y1='12' x2='19' y2='12' stroke='black' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cline x1='12' y1='5' x2='12' y2='19' stroke='black' stroke-width='2.5' stroke-linecap='round'/%3E%3Cline x1='5' y1='12' x2='19' y2='12' stroke='black' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E");
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

.tab-item.is-active {
  color: var(--accent);
  background: rgba(87, 112, 255, 0.1);
}

.tab-badge {
  position: absolute;
  top: 8rpx;
  right: 12rpx;
  min-width: 30rpx;
  height: 30rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  background: var(--danger);
  color: var(--text-inverse);
  font-size: 18rpx;
  font-weight: 600;
  line-height: 30rpx;
  text-align: center;
  box-sizing: border-box;
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
