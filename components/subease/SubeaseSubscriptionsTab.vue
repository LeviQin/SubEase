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

    <view v-if="loading" class="skeleton-list">
      <view v-for="i in 5" :key="i" class="skeleton-row">
        <view class="skeleton-dot"></view>
        <view class="skeleton-lines">
          <view class="skeleton-line skeleton-line-title"></view>
          <view class="skeleton-line skeleton-line-sub"></view>
        </view>
        <view class="skeleton-line skeleton-line-price"></view>
      </view>
    </view>

    <view v-else-if="subscriptions.length" class="list-card">
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

        <view class="list-row" @click="onRowClick(item.id)" @longpress="$emit('toggle-select', item.id)">
          <view
            v-if="selectedIds.length"
            :class="['select-indicator', selectedIds.includes(item.id) ? 'is-selected' : '']"
            @click.stop="$emit('toggle-select', item.id)"
          ></view>
          <view class="sub-avatar" :style="{ background: getCategoryColor(item.category) }">{{ getAvatarText(item.name) }}</view>
          <view class="row-main">
            <text class="row-title">{{ item.name }}</text>
            <view class="row-sub-line">
              <text class="row-sub">{{ item.category }} · {{ item.cycle }} · {{ formatShortDate(item.displayDate || item.nextDate) }}</text>
              <text v-if="item.status === 'expired'" class="status-chip status-chip-expired">已过期</text>
              <text v-else-if="item.status === 'rolled'" class="status-chip status-chip-rolled">已续期</text>
            </view>
          </view>
          <view class="row-trailing">
            <text class="row-price">{{ formatCurrency(item.price, item.currency) }}</text>
            <text v-if="item.autoRenew" class="row-badge">自动</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty-state">
      <view class="empty-illustration">
        <view class="empty-circle"></view>
      </view>
      <text class="empty-title">{{ searchKeyword || filterCategory ? '没有匹配结果' : '还没有订阅' }}</text>
      <text class="empty-desc">
        {{ searchKeyword || filterCategory ? '尝试清空搜索或筛选条件。' : '点击右下角开始记录你的订阅。' }}
      </text>
    </view>

    <view v-if="selectedIds.length" class="select-bar-spacer"></view>

    <view v-if="selectedIds.length" class="select-bar">
      <text class="select-text">已选 {{ selectedIds.length }} 项</text>
      <view class="select-actions">
        <view class="select-secondary" @click="$emit('select-all')">全选</view>
        <view class="select-secondary" @click="$emit('clear-selection')">清空</view>
        <view class="select-danger" @click="$emit('batch-delete')">删除</view>
      </view>
    </view>
  </scroll-view>
</template>

<script>
import { formatCurrency, formatShortDate, getAvatarText, getCategoryColor } from '@/utils/subease/helpers'

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
    },
    loading: {
      type: Boolean,
      default: false
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
    'select-all',
    'clear-selection'
  ],
  data() {
    return {
      touchStartX: 0,
      swipedId: null
    }
  },
  watch: {
    // 进入多选模式时收起已展开的左滑操作，避免手势冲突
    selectedIds(val, oldVal) {
      if (val.length && !oldVal.length) {
        this.swipedId = null
      }
    }
  },
  methods: {
    formatCurrency,
    formatShortDate,
    getAvatarText,
    getCategoryColor,
    handleInput(event) {
      this.$emit('update-search', event.detail.value)
    },
    onRowClick(id) {
      // 多选模式下点击行体 = 切换选中，而非打开详情
      if (this.selectedIds.length > 0) {
        this.$emit('toggle-select', id)
        this.swipedId = null
        return
      }
      this.$emit('open-detail', id)
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
  padding: 28rpx 36rpx var(--content-bottom-space);
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
  overflow: hidden;
  /* 未滑开时整体移出容器（由 row-shell 的 overflow:hidden 裁切），杜绝边缘露出 */
  transform: translateX(100%);
  transition: transform var(--transition-normal);
}

.row-shell.is-swiped .swipe-actions {
  transform: translateX(0);
}

/* 仅最后一行保留右下圆角，与列表容器圆角对齐，避免中间行出现缺口 */
.row-shell:last-child .swipe-actions {
  border-radius: 0 0 var(--radius-card) 0;
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
  background: var(--accent);
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

.sub-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 80rpx;
  height: 80rpx;
  margin-right: 20rpx;
  border-radius: 22rpx;
  color: #ffffff;
  font-size: 34rpx;
  font-weight: 700;
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

.row-sub-line {
  display: flex;
  align-items: center;
  min-width: 0;
}

.row-sub-line .row-sub {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.status-chip {
  flex-shrink: 0;
  margin-left: 12rpx;
  padding: 3rpx 14rpx;
  border-radius: var(--radius-pill);
  font-size: 20rpx;
  font-weight: 600;
}

.status-chip-expired {
  background: var(--danger-light);
  color: var(--danger);
}

.status-chip-rolled {
  background: var(--success-light);
  color: var(--success);
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

.empty-state {
  padding: 100rpx 32rpx 80rpx;
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-card);
  text-align: center;
  box-shadow: var(--shadow-card);
}

.empty-illustration {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}

.empty-circle {
  position: relative;
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: var(--bg-accent);
}

.empty-circle::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 44rpx;
  height: 44rpx;
  margin: -22rpx 0 0 -22rpx;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.85;
}

.empty-circle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16rpx;
  height: 16rpx;
  margin: -8rpx 0 0 -8rpx;
  border-radius: 50%;
  background: var(--bg-elevated);
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
  bottom: calc(var(--content-bottom-space) + 20px);
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  background: var(--frosted-surface);
  border: 1px solid var(--separator);
  border-radius: var(--radius-control);
  box-shadow: var(--shadow-raised);
  backdrop-filter: blur(20rpx);
}

.select-bar-spacer {
  height: calc(20px + 140rpx);
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

.skeleton-list {
  overflow: hidden;
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.skeleton-row {
  display: flex;
  align-items: center;
  min-height: 132rpx;
  padding: 0 28rpx;
  border-bottom: 1px solid var(--separator);
}

.skeleton-row:last-child {
  border-bottom: 0;
}

.skeleton-dot {
  width: 42rpx;
  height: 42rpx;
  margin-right: 18rpx;
  border-radius: 50%;
  background: var(--bg-muted);
}

.skeleton-lines {
  flex: 1;
  min-width: 0;
}

.skeleton-line {
  height: 26rpx;
  border-radius: 999rpx;
  background: var(--bg-muted);
}

.skeleton-line-title {
  width: 42%;
  margin-bottom: 12rpx;
}

.skeleton-line-sub {
  width: 68%;
  height: 22rpx;
}

.skeleton-line-price {
  width: 96rpx;
  height: 26rpx;
  margin-left: 24rpx;
  flex-shrink: 0;
}

.skeleton-dot,
.skeleton-line {
  animation: skeletonPulse 1.4s ease-in-out infinite;
}

@keyframes skeletonPulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}
</style>
