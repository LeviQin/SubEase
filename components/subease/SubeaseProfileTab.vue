<template>
  <scroll-view class="tab-scroll" scroll-y :show-scrollbar="false">
    <!-- 用户信息卡片 -->
    <view class="profile-card">
      <!-- 未登录 -->
      <template v-if="!loggedIn">
        <view class="profile-card-body">
          <view class="avatar avatar-placeholder">
            <text class="avatar-text">{{ profile.avatarText }}</text>
          </view>
          <view class="profile-info">
            <text class="profile-name">{{ profile.nickname }}</text>
            <text class="profile-desc">登录后可同步订阅数据</text>
          </view>
        </view>
        <button class="login-btn" @click="$emit('request-login')">微信登录</button>
      </template>

      <!-- 已登录 -->
      <template v-else>
        <view class="profile-card-body">
          <view class="avatar">
            <image v-if="profile.avatarUrl" class="avatar-img" :src="profile.avatarUrl" mode="aspectFill" />
            <text v-else class="avatar-text">{{ profile.avatarText }}</text>
          </view>
          <view class="profile-info">
            <view class="profile-name-row">
              <text class="profile-name">{{ profile.nickname }}</text>
            </view>
            <text v-if="profile.idText" class="profile-id">{{ profile.idText }}</text>
          </view>
        </view>
      </template>
    </view>

    <view class="settings-section">
      <view
        v-if="loggedIn"
        class="settings-row"
        @click="$emit('sync-profile')"
      >
        <text class="settings-left">{{ syncProfileLoading ? '同步中...' : '同步微信资料' }}</text>
        <view class="settings-arrow"></view>
      </view>
      <view class="settings-row" @click="$emit('change-remind-days')">
        <text class="settings-left">提前提醒</text>
        <view class="settings-right">
          <text>{{ remindDaysLabel }}</text>
          <view class="settings-arrow"></view>
        </view>
      </view>
      <view v-if="loggedIn" class="settings-row" @click="$emit('change-budget')">
        <text class="settings-left">月度预算</text>
        <view class="settings-right">
          <text>{{ monthlyBudgetLabel }}</text>
          <view class="settings-arrow"></view>
        </view>
      </view>
      <view v-if="loggedIn" class="settings-row" @click="$emit('subscribe')">
        <text class="settings-left">授权 1 次到期提醒</text>
        <view class="settings-right">
          <text>剩余 {{ reminderRemain }} 次</text>
          <view class="settings-arrow"></view>
        </view>
      </view>
      <view v-if="loggedIn" class="settings-row" @click="$emit('action', '我的反馈')">
        <text class="settings-left">我的反馈</text>
        <view class="settings-arrow"></view>
      </view>
      <view v-if="loggedIn" class="settings-row" @click="$emit('action', '导出数据')">
        <text class="settings-left">导出数据</text>
        <view class="settings-arrow"></view>
      </view>
      <view v-if="loggedIn" class="settings-row" @click="$emit('action', '年度账单报告')">
        <text class="settings-left">年度账单报告</text>
        <view class="settings-arrow"></view>
      </view>
      <view v-if="loggedIn" class="settings-row" @click="$emit('action', '批量导入')">
        <text class="settings-left">批量导入</text>
        <view class="settings-arrow"></view>
      </view>
      <view class="settings-row" @click="$emit('action', '反馈')">
        <text class="settings-left">意见反馈</text>
        <view class="settings-arrow"></view>
      </view>
      <view class="settings-row" @click="$emit('action', '关于')">
        <text class="settings-left">关于</text>
        <view class="settings-arrow"></view>
      </view>
      <view v-if="loggedIn" class="settings-row" @click="$emit('logout')">
        <text class="settings-left danger-text">退出登录</text>
      </view>
    </view>
  </scroll-view>
</template>

<script>
export default {
  name: 'SubeaseProfileTab',
  props: {
    loggedIn: {
      type: Boolean,
      default: false
    },
    profile: {
      type: Object,
      default: () => ({
        nickname: '请微信登录',
        avatarText: 'USER',
        idText: ''
      })
    },
    settingsRemindDays: {
      type: Number,
      default: 3
    },
    remindDaysLabel: {
      type: String,
      default: '提前 3 天'
    },
    monthlyBudgetLabel: {
      type: String,
      default: '未设置'
    },
    syncProfileLoading: {
      type: Boolean,
      default: false
    },
    reminderRemain: {
      type: Number,
      default: 0
    }
  },
  emits: ['request-login', 'logout', 'action', 'change-remind-days', 'change-budget', 'sync-profile', 'subscribe']
}
</script>

<style scoped lang="scss">
.tab-scroll {
  height: 100%;
  padding: 32rpx var(--page-gutter) var(--content-bottom-space);
}

/* ===== 用户信息卡片 ===== */
.profile-card {
  margin-bottom: 32rpx;
  overflow: hidden;
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.profile-card-body {
  display: flex;
  align-items: center;
  padding: 38rpx 32rpx;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: var(--bg-accent);
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.avatar-text {
  color: var(--accent);
  font-size: 28rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.profile-info {
  flex: 1;
  min-width: 0;
  margin-left: 28rpx;
}

.profile-name-row {
  display: flex;
  align-items: center;
}

.profile-name {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.5;
  color: var(--text-secondary);
}

.profile-id {
  display: block;
  margin-top: 8rpx;
  font-size: 23rpx;
  font-weight: 500;
  color: var(--text-tertiary);
}

.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 88rpx;
  border: none;
  border-top: 1px solid var(--separator);
  background: transparent;
  color: var(--accent);
  font-size: 27rpx;
  font-weight: 600;
  line-height: 1;
}

.login-btn:active {
  background: var(--bg-muted);
}

/* ===== 设置列表 ===== */
.settings-section {
  margin-bottom: 24rpx;
  overflow: hidden;
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 104rpx;
  padding: 0 28rpx;
  border-bottom: 1px solid var(--separator);
}

.settings-row:active {
  background: var(--bg-subtle);
}

.settings-row:last-child {
  border-bottom: 0;
}

.settings-left {
  font-size: 29rpx;
  font-weight: 500;
  color: var(--text-primary);
}

.settings-right {
  display: flex;
  align-items: center;
  font-size: 25rpx;
  color: var(--text-secondary);
}

.settings-right .settings-arrow {
  margin-left: 8rpx;
}

.settings-arrow {
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
  flex-shrink: 0;
}

.danger-text {
  color: var(--danger);
  font-weight: 600;
}
</style>
