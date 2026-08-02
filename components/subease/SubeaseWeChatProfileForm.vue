<template>
  <view class="wechat-profile-form">
    <text class="wechat-form-tip">{{ description }}</text>

    <view class="wechat-form-card">
      <text class="wechat-form-label">微信头像</text>
      <button
        class="avatar-picker"
        open-type="chooseAvatar"
        :disabled="disabled"
        @chooseavatar="$emit('choose-avatar', $event)"
      >
        <image v-if="avatarPreview" class="avatar-image" :src="avatarPreview" mode="aspectFill" />
        <view v-else class="avatar-placeholder">
          <text class="avatar-placeholder-text">选择头像</text>
        </view>
      </button>
    </view>

    <view class="wechat-form-card">
      <text class="wechat-form-label">微信昵称</text>
      <input
        class="wechat-nickname-input"
        type="nickname"
        :value="nickname"
        :maxlength="16"
        :disabled="disabled"
        placeholder="请输入昵称"
        placeholder-class="wechat-placeholder"
        @input="$emit('update:nickname', $event.detail.value)"
      />
    </view>
  </view>
</template>

<script>
export default {
  name: 'SubeaseWeChatProfileForm',
  props: {
    avatarPreview: {
      type: String,
      default: ''
    },
    nickname: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: '请填写微信头像和昵称'
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['choose-avatar', 'update:nickname']
}
</script>

<style scoped lang="scss">
.wechat-profile-form {
  display: flex;
  flex-direction: column;
}

.wechat-profile-form > text + view,
.wechat-profile-form > view + view {
  margin-top: 20rpx;
}

.wechat-form-tip {
  display: block;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--text-secondary);
}

.wechat-form-card {
  padding: 26rpx 24rpx;
  background: var(--bg-subtle);
  border: 1px solid var(--separator);
  border-radius: var(--radius-md);
}

.wechat-form-label {
  display: block;
  margin-bottom: 16rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-secondary);
}

.avatar-picker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 132rpx;
  height: 132rpx;
  padding: 0;
  overflow: hidden;
  background: transparent;
  border: none;
  border-radius: 50%;
  box-shadow: var(--shadow-xs);
}

.avatar-picker::after {
  border: none;
}

.avatar-image,
.avatar-placeholder {
  width: 132rpx;
  height: 132rpx;
  border-radius: 50%;
}

.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7ff, #e9eefb);
}

.avatar-placeholder-text {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--accent);
}

.wechat-nickname-input {
  height: 88rpx;
  padding: 0 24rpx;
  background: var(--bg-elevated);
  border: 1px solid var(--separator-strong);
  border-radius: var(--radius-control);
  font-size: 28rpx;
  color: var(--text-primary);
  box-sizing: border-box;
}

.wechat-nickname-input:focus {
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
}

.wechat-placeholder {
  color: var(--text-quaternary);
}
</style>
