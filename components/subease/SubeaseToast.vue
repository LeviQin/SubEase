<template>
  <view v-if="visible" class="toast">{{ message }}</view>
</template>

<script>
export default {
  name: 'SubeaseToast',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: ''
    }
  }
}
</script>

<style scoped lang="scss">
.toast {
  position: fixed;
  top: 120rpx;
  left: 50%;
  z-index: 60;
  max-width: calc(100vw - 96rpx);
  padding: 22rpx 34rpx;
  border-radius: var(--radius-pill);
  background: rgba(28, 28, 30, 0.88);
  color: var(--text-inverse);
  font-size: 26rpx;
  font-weight: 500;
  letter-spacing: 0.3rpx;
  transform: translateX(-50%);
  box-shadow: var(--shadow-raised);
  text-align: center;
  backdrop-filter: blur(16rpx);
}
</style>
