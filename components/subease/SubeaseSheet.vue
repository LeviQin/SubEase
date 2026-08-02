<template>
  <view v-if="visible" class="sheet-overlay" @click="$emit('close')">
    <view class="sheet-panel" @click.stop>
      <view class="sheet-handle"></view>
      <view v-if="title" class="sheet-header">
        <text class="sheet-title">{{ title }}</text>
        <view class="sheet-close" @click="$emit('close')"></view>
      </view>
      <scroll-view class="sheet-scroll" scroll-y :show-scrollbar="false">
        <slot></slot>
      </scroll-view>
      <view v-if="footerButtons && footerButtons.length" class="sheet-footer">
        <view
          v-for="btn in footerButtons"
          :key="btn.key"
          :class="['sheet-btn', 'sheet-btn-' + btn.type, btn.disabled ? 'is-disabled' : '']"
          @click="onFooterClick(btn)"
        >
          {{ btn.text }}
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'SubeaseSheet',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: ''
    },
    footerButtons: {
      type: Array,
      default: null
    }
  },
  emits: ['close', 'footer-action'],
  methods: {
    onFooterClick(btn) {
      if (!btn || btn.disabled) return
      this.$emit('footer-action', btn.key)
    }
  }
}
</script>

<style scoped lang="scss">
.sheet-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 40;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: var(--bg-overlay);
  animation: overlayFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes overlayFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.sheet-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: calc(78vh + env(safe-area-inset-bottom, 0px));
  overflow: hidden;
  background: var(--bg-elevated);
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  box-shadow: var(--shadow-modal);
  animation: panelSlideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

@keyframes panelSlideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.sheet-handle {
  flex-shrink: 0;
  width: 64rpx;
  height: 8rpx;
  margin: 22rpx auto 0;
  border-radius: var(--radius-pill);
  background: var(--separator-strong);
}

.sheet-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx 18rpx;
}

.sheet-title {
  font-size: 34rpx;
  font-weight: 700;
  letter-spacing: -0.3rpx;
  color: var(--text-primary);
}

.sheet-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: var(--bg-muted);
  transition: background var(--transition-fast);
}

.sheet-close::after {
  content: '';
  width: 22rpx;
  height: 22rpx;
  background-color: var(--text-secondary);
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cline x1='3' y1='3' x2='13' y2='13' stroke='black' stroke-width='2.5' stroke-linecap='round'/%3E%3Cline x1='13' y1='3' x2='3' y2='13' stroke='black' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cline x1='3' y1='3' x2='13' y2='13' stroke='black' stroke-width='2.5' stroke-linecap='round'/%3E%3Cline x1='13' y1='3' x2='3' y2='13' stroke='black' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E");
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

.sheet-close:active {
  background: rgba(118, 118, 128, 0.2);
}

.sheet-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 32rpx 12rpx;
  box-sizing: border-box;
}

.sheet-footer {
  flex-shrink: 0;
  display: flex;
  padding: 24rpx 32rpx calc(28rpx + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--separator);
  background: rgba(255, 255, 255, 0.94);
}

.sheet-btn {
  flex-grow: 1;
  flex-shrink: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 96rpx;
  margin-right: 16rpx;
  border-radius: var(--radius-control);
  font-size: 30rpx;
  font-weight: 600;
  text-align: center;
  transition:
    transform var(--transition-fast),
    background var(--transition-fast),
    color var(--transition-fast);
}

.sheet-btn:last-child {
  margin-right: 0;
}

.sheet-btn.is-disabled {
  opacity: 0.45;
}

.sheet-btn-secondary {
  background: var(--bg-muted);
  color: var(--text-primary);
}

.sheet-btn-primary {
  background: var(--accent);
  color: var(--text-inverse);
  box-shadow: var(--shadow-raised);
}

.sheet-btn-danger {
  background: var(--danger);
  color: var(--text-inverse);
  box-shadow: var(--shadow-raised);
}

.sheet-btn:active {
  transform: scale(0.985);
}
</style>
