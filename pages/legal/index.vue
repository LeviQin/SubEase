<template>
  <view class="legal-page">
    <view class="about-card">
      <image class="about-logo" src="/static/logo.png" mode="aspectFit" />
      <text class="about-name">{{ about.appName }}</text>
      <text class="about-version">{{ about.version }}</text>
      <text class="about-desc">{{ about.description }}</text>
      <text class="about-meta">{{ about.contact }}</text>
      <text class="about-meta">运营主体：{{ about.entity }}</text>
      <text class="about-meta">{{ about.icp }}</text>
    </view>

    <view class="link-card">
      <view class="link-row" @click="open('/pages/legal/agreement')">
        <text class="link-label">用户服务协议</text>
        <view class="link-arrow"></view>
      </view>
      <view class="link-row" @click="open('/pages/legal/privacy')">
        <text class="link-label">隐私政策</text>
        <view class="link-arrow"></view>
      </view>
    </view>

    <text class="copyright">Copyright © {{ year }} 归期本</text>
  </view>
</template>

<script>
import { ABOUT_INFO } from '@/utils/subease/legal-content'

export default {
  name: 'SubeaseLegalIndex',
  data() {
    return {
      about: ABOUT_INFO,
      year: new Date().getFullYear()
    }
  },
  methods: {
    open(url) {
      uni.navigateTo({ url })
    }
  }
}
</script>

<style scoped lang="scss">
.legal-page {
  min-height: 100vh;
  padding: 48rpx 32rpx;
  background: var(--app-bg);
  box-sizing: border-box;
}

.about-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 32rpx;
  margin-bottom: 32rpx;
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.about-logo {
  width: 145rpx;
  height: 145rpx;
  border-radius: 28rpx;
}

.about-name {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.about-version {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--text-tertiary);
}

.about-desc {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: var(--text-secondary);
}

.about-meta {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
}

.link-card {
  overflow: hidden;
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.link-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 104rpx;
  padding: 0 28rpx;
  border-bottom: 1px solid var(--separator);
}

.link-row:last-child {
  border-bottom: 0;
}

.link-row:active {
  background: var(--bg-subtle);
}

.link-label {
  font-size: 29rpx;
  font-weight: 500;
  color: var(--text-primary);
}

.link-arrow {
  width: 28rpx;
  height: 28rpx;
  background-color: var(--text-quaternary);
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpolyline points='6 4 10 8 6 12' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpolyline points='6 4 10 8 6 12' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

.copyright {
  display: block;
  margin-top: 48rpx;
  font-size: 22rpx;
  color: var(--text-quaternary);
  text-align: center;
}
</style>
