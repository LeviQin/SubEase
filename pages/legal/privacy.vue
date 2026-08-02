<template>
  <scroll-view class="legal-doc" scroll-y :show-scrollbar="false">
    <view v-for="(section, index) in sections" :key="index" class="doc-section">
      <text class="doc-title">{{ section.title }}</text>
      <text class="doc-content">{{ section.content }}</text>
    </view>
  </scroll-view>
</template>

<script>
import { PRIVACY_SECTIONS } from '@/utils/subease/legal-content'

export default {
  name: 'SubeasePrivacy',
  data() {
    return {
      sections: PRIVACY_SECTIONS
    }
  }
}
</script>

<style scoped lang="scss">
.legal-doc {
  height: 100vh;
  padding: 40rpx 32rpx 80rpx;
  background: var(--app-bg);
  box-sizing: border-box;
}

.doc-section {
  margin-bottom: 36rpx;
}

.doc-title {
  display: block;
  margin-bottom: 14rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.doc-content {
  display: block;
  font-size: 27rpx;
  line-height: 1.8;
  color: var(--text-secondary);
  white-space: pre-wrap;
}
</style>
