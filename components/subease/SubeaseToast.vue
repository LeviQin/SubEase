<template>
  <view v-if="visible" class="toast" :style="toastStyle">{{ message }}</view>
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
    },
    // 距离视口顶部的偏移（px），由父页面按自定义导航栏高度传入，避免被遮挡
    top: {
      type: String,
      default: '120rpx'
    }
  },
  computed: {
    toastStyle() {
      return { top: this.top }
    }
  }
}
</script>

<style scoped lang="scss">
.toast {
  position: fixed;
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
