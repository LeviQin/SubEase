<template>
  <scroll-view class="tab-scroll" scroll-y :show-scrollbar="false">
    <view class="toolbar">
      <view class="search-box">
        <view class="search-icon"></view>
        <input
          class="search-input"
          :value="searchKeyword"
          placeholder="搜索订阅"
          placeholder-class="search-placeholder"
          @input="handleInput"
        />
      </view>
      <view class="toolbar-actions">
        <view class="chip-button" @click="$emit('open-filter')">
          {{ filterCategory || '筛选' }}
        </view>
        <view class="chip-button" @click="$emit('toggle-sort')">
          {{ sortOrder === 'date' ? '日期' : '金额' }}
        </view>
      </view>
    </view>

    <view v-if="subscriptions.length" class="list-card">
      <view
        v-for="item in subscriptions"
        :key="item.id"
        :class="['row-shell', swipedId === item.id ? 'is-swiped' : '']"
        @touchstart="onTouchStart($event, item.id)"
        @touchend="onTouchEnd($event, item.id)"
      >
        <view class="swipe-actions">
          <view class="swipe-btn swipe-edit" @click.stop="$emit('edit', item.id)">编辑</view>
          <view class="swipe-btn swipe-delete" @click.stop="$emit('delete', item.id)">删除</view>
        </view>

        <view class="list-row" @click="$emit('open-detail', item.id)" @longpress="$emit('toggle-select', item.id)">
          <view
            :class="['select-indicator', selectedIds.includes(item.id) ? 'is-selected' : '']"
            @click.stop="$emit('toggle-select', item.id)"
          ></view>
          <view class="row-main">
            <text class="row-title">{{ item.name }}</text>
            <text class="row-sub">{{ item.category }} · {{ item.cycle }} · {{ formatShortDate(item.nextDate) }}</text>
          </view>
          <view class="row-trailing">
            <text class="row-price">{{ formatCurrency(item.price, item.currency) }}</text>
            <text v-if="item.autoRenew" class="row-badge">自动</text>
            <view v-else class="row-actions-inline">
              <text class="row-link" @click.stop="$emit('edit', item.id)">编辑</text>
              <text class="row-link row-link-danger" @click.stop="$emit('delete', item.id)">删除</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty-state">
      <text class="empty-title">{{ searchKeyword || filterCategory ? '没有匹配结果' : '还没有订阅' }}</text>
      <text class="empty-desc">
        {{ searchKeyword || filterCategory ? '尝试清空搜索或筛选条件。' : '点击右下角开始记录你的订阅。' }}
      </text>
    </view>

    <view v-if="selectedIds.length" class="select-bar">
      <text class="select-text">已选 {{ selectedIds.length }} 项</text>
      <view class="select-actions">
        <view class="select-secondary" @click="$emit('clear-selection')">清空</view>
        <view class="select-danger" @click="$emit('batch-delete')">删除</view>
      </view>
    </view>
  </scroll-view>
</template>

<script>
import { formatCurrency, formatShortDate } from '@/utils/subease/helpers'

export default {
  name: 'SubeaseSubscriptionsTab',
  props: {
    subscriptions: {
      type: Array,
      default: () => []
    },
    searchKeyword: {
      type: String,
      default: ''
    },
    filterCategory: {
      type: String,
      default: ''
    },
    sortOrder: {
      type: String,
      default: 'date'
    },
    selectedIds: {
      type: Array,
      default: () => []
    }
  },
  emits: [
    'update-search',
    'open-filter',
    'toggle-sort',
    'open-detail',
    'edit',
    'delete',
    'toggle-select',
    'batch-delete',
    'clear-selection'
  ],
  data() {
    return {
      touchStartX: 0,
      swipedId: null
    }
  },
  methods: {
    formatCurrency,
    formatShortDate,
    handleInput(event) {
      this.$emit('update-search', event.detail.value)
    },
    onTouchStart(event, id) {
      this.touchStartX = event.changedTouches?.[0]?.clientX || 0
      if (this.swipedId !== id) {
        this.swipedId = null
      }
    },
    onTouchEnd(event, id) {
      const endX = event.changedTouches?.[0]?.clientX || 0
      const diff = this.touchStartX - endX
      if (diff > 60) {
        this.swipedId = id
        return
      }
      if (diff < -30 && this.swipedId === id) {
        this.swipedId = null
      }
    }
  }
}
</script>

<style scoped lang="scss">
.tab-scroll {
  height: 100%;
  padding: 28rpx 36rpx 260rpx;
}

.toolbar {
  margin-bottom: 24rpx;
}

.search-box {
  display: flex;
  align-items: center;
  height: 80rpx;
  padding: 0 24rpx;
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-control);
  box-shadow: var(--shadow-card);
}

.search-box:focus-within {
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
}

.search-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 12rpx;
  background-color: var(--text-tertiary);
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='10' cy='10' r='7' fill='none' stroke='black' stroke-width='2.5'/%3E%3Cline x1='15.5' y1='15.5' x2='21' y2='21' stroke='black' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='10' cy='10' r='7' fill='none' stroke='black' stroke-width='2.5'/%3E%3Cline x1='15.5' y1='15.5' x2='21' y2='21' stroke='black' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E");
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  height: 80rpx;
  font-size: 28rpx;
  color: var(--text-primary);
}

.search-placeholder {
  color: var(--text-quaternary);
}

.toolbar-actions {
  display: flex;
  margin-top: 16rpx;
}

.toolbar-actions .chip-button {
  margin-right: 14rpx;
}

.toolbar-actions .chip-button:last-child {
  margin-right: 0;
}

.chip-button {
  padding: 18rpx 28rpx;
  border-radius: var(--radius-pill);
  background: var(--bg-elevated);
  font-size: 26rpx;
  font-weight: 500;
  color: var(--text-secondary);
  border: 1px solid var(--separator);
  box-shadow: var(--shadow-xs);
}

.list-card {
  overflow: hidden;
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.row-shell {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--separator);
}

.row-shell:last-child {
  border-bottom: 0;
}

.swipe-actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  width: 220rpx;
  border-radius: 0 var(--radius-card) var(--radius-card) 0;
  overflow: hidden;
}

.swipe-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 110rpx;
  font-size: 26rpx;
  color: #fff;
  font-weight: 600;
}

.swipe-edit {
  background: #5ac8fa;
}

.swipe-delete {
  background: var(--danger);
}

.list-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  min-height: 132rpx;
  padding: 0 28rpx;
  background: var(--bg-elevated);
  transition: transform var(--transition-normal);
}

.row-shell.is-swiped .list-row {
  transform: translateX(-220rpx);
}

.select-indicator {
  width: 42rpx;
  height: 42rpx;
  margin-right: 18rpx;
  border: 2px solid var(--separator-strong);
  border-radius: 50%;
  background: var(--bg-elevated);
  flex-shrink: 0;
}

.select-indicator.is-selected {
  border-color: var(--accent);
  background: var(--accent);
}

.select-indicator.is-selected::after {
  content: '';
  display: block;
  width: 14rpx;
  height: 14rpx;
  margin: 12rpx auto 0;
  background-color: #fff;
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpolyline points='3 8 7 12 13 4' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpolyline points='3 8 7 12 13 4' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

.row-main {
  flex: 1;
  min-width: 0;
}

.row-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.row-sub {
  font-size: 24rpx;
  color: var(--text-secondary);
}

.row-trailing {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-left: 24rpx;
}

.row-price {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.row-badge {
  margin-top: 8rpx;
  padding: 6rpx 18rpx;
  border-radius: var(--radius-pill);
  background: rgba(34, 197, 94, 0.1);
  font-size: 20rpx;
  font-weight: 600;
  color: var(--success);
}

.row-actions-inline {
  display: flex;
  margin-top: 8rpx;
}

.row-actions-inline .row-link {
  margin-right: 14rpx;
}

.row-actions-inline .row-link:last-child {
  margin-right: 0;
}

.row-link {
  font-size: 22rpx;
  font-weight: 500;
  color: var(--accent);
}

.row-link-danger {
  color: var(--danger);
}

.empty-state {
  padding: 100rpx 32rpx;
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-card);
  text-align: center;
  box-shadow: var(--shadow-card);
}

.empty-title {
  display: block;
  margin-bottom: 12rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.empty-desc {
  font-size: 24rpx;
  color: var(--text-secondary);
}

.select-bar {
  position: fixed;
  left: 36rpx;
  right: 36rpx;
  bottom: 320rpx; /* 位于 FAB(bottom:200rpx, 高104rpx, 顶部304rpx) 之上，不与其重叠 */
  z-index: 30; /* 高于 FAB(20)，避免被右下角按钮遮挡 */
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid var(--separator);
  border-radius: var(--radius-control);
  box-shadow: var(--shadow-raised);
  backdrop-filter: blur(20rpx);
}

.select-text {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.select-actions {
  display: flex;
}

.select-actions .select-secondary {
  margin-right: 12rpx;
}

.select-secondary,
.select-danger {
  padding: 16rpx 26rpx;
  border-radius: var(--radius-pill);
  font-size: 24rpx;
  font-weight: 600;
}

.select-secondary {
  background: var(--bg-muted);
  color: var(--text-primary);
}

.select-danger {
  background: var(--danger);
  color: var(--text-inverse);
  box-shadow: var(--shadow-xs);
}
</style>
