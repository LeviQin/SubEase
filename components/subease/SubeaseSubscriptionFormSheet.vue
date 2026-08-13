<template>
  <view>
    <view class="preset-entry" @click="$emit('open-preset')">
      <text class="preset-entry-text">从热门订阅预设库添加</text>
      <view class="preset-entry-arrow"></view>
    </view>

    <view class="form-field">
      <text class="form-label">名称</text>
      <input
        class="form-input"
        :value="form.name"
        placeholder="例如：Netflix"
        placeholder-class="form-placeholder"
        maxlength="30"
        @input="$emit('update-field', { field: 'name', value: $event.detail.value })"
      />
    </view>

    <view class="form-row">
      <view class="form-field flex-1">
        <text class="form-label">金额</text>
        <input
          class="form-input"
          type="digit"
          :value="String(form.price)"
          placeholder="0.00"
          placeholder-class="form-placeholder"
          maxlength="12"
          @input="$emit('update-field', { field: 'price', value: $event.detail.value })"
        />
      </view>
      <view class="form-field compact-field">
        <text class="form-label">货币</text>
        <picker
          mode="selector"
          :range="currencyOptions"
          :value="currencyIndex"
          @change="$emit('currency-change', $event)"
        >
          <view class="form-input picker-input">{{ form.currency }}</view>
        </picker>
      </view>
    </view>

    <view class="form-field">
      <text class="form-label">分类</text>
      <view class="option-group">
        <view
          v-for="item in categoryOptions"
          :key="item"
          :class="['option-chip', form.category === item ? 'is-active' : '']"
          @click="$emit('update-field', { field: 'category', value: item })"
        >
          {{ item }}
        </view>
        <view class="option-chip option-chip-add" @click="$emit('add-category')">＋ 自定义</view>
      </view>
    </view>

    <view class="form-field">
      <text class="form-label">周期</text>
      <view class="option-group">
        <view
          v-for="item in ['月付', '季度付', '年付']"
          :key="item"
          :class="['option-chip', form.cycle === item ? 'is-active' : '']"
          @click="$emit('update-field', { field: 'cycle', value: item })"
        >
          {{ item }}
        </view>
      </view>
    </view>

    <view class="form-field">
      <text class="form-label">下次付款日</text>
      <picker
        mode="date"
        :value="form.nextDate"
        @change="$emit('update-field', { field: 'nextDate', value: $event.detail.value })"
      >
        <view class="form-input picker-input">{{ form.nextDate }}</view>
      </picker>
    </view>

    <view class="form-field">
      <text class="form-label">支付方式</text>
      <input
        class="form-input"
        :value="form.method"
        placeholder="微信 / 支付宝 / 信用卡"
        placeholder-class="form-placeholder"
        maxlength="20"
        @input="$emit('update-field', { field: 'method', value: $event.detail.value })"
      />
    </view>

    <view class="switch-row">
      <text class="switch-label">自动续费</text>
      <view
        :class="['switch', form.autoRenew ? 'is-on' : '']"
        @click="$emit('update-field', { field: 'autoRenew', value: !form.autoRenew })"
      >
        <view class="switch-dot"></view>
      </view>
    </view>

    <view class="form-field">
      <text class="form-label">备注</text>
      <input
        class="form-input"
        :value="form.notes"
        placeholder="选填"
        placeholder-class="form-placeholder"
        maxlength="60"
        @input="$emit('update-field', { field: 'notes', value: $event.detail.value })"
      />
    </view>
  </view>
</template>

<script>
export default {
  name: 'SubeaseSubscriptionFormSheet',
  props: {
    form: {
      type: Object,
      default: () => ({})
    },
    categoryOptions: {
      type: Array,
      default: () => []
    },
    currencyOptions: {
      type: Array,
      default: () => []
    },
    currencyIndex: {
      type: Number,
      default: 0
    }
  },
  emits: ['update-field', 'currency-change', 'add-category', 'open-preset']
}
</script>

<style scoped lang="scss">
.preset-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 28rpx;
  margin-bottom: 24rpx;
  background: var(--bg-accent);
  border-radius: var(--radius-control);
}

.preset-entry:active {
  opacity: 0.8;
}

.preset-entry-text {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--accent);
}

.preset-entry-arrow {
  width: 28rpx;
  height: 28rpx;
  background-color: var(--accent);
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpolyline points='6 4 10 8 6 12' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpolyline points='6 4 10 8 6 12' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

.form-field {
  margin-bottom: 24rpx;
}

.form-row {
  display: flex;
}

.form-row .form-field {
  margin-right: 14rpx;
}

.form-row .form-field:last-child {
  margin-right: 0;
}

.flex-1 {
  flex: 1;
}

.compact-field {
  width: 210rpx;
}

.form-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5rpx;
}

.option-group {
  display: flex;
  flex-wrap: wrap;
  margin-right: -14rpx;
}

.option-group .option-chip {
  margin-right: 14rpx;
  margin-bottom: 14rpx;
}

.option-chip {
  padding: 18rpx 28rpx;
  border-radius: var(--radius-pill);
  background: var(--bg-muted);
  font-size: 26rpx;
  font-weight: 500;
  color: var(--text-secondary);
}

.option-chip.is-active {
  background: var(--accent);
  color: var(--text-inverse);
  font-weight: 600;
  box-shadow: var(--shadow-xs);
}

.option-chip-add {
  border: 1px dashed var(--separator-strong);
  background: transparent;
  color: var(--accent);
  font-weight: 600;
}

.form-input {
  width: 100%;
  min-height: 96rpx;
  padding: 0 28rpx;
  background: var(--bg-elevated);
  border: 1px solid var(--separator-strong);
  border-radius: var(--radius-control);
  font-size: 28rpx;
  color: var(--text-primary);
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
}

.picker-input {
  display: flex;
  align-items: center;
  position: relative;
  padding-right: 48rpx;
  color: var(--text-primary);
}

.picker-input::after {
  content: '';
  position: absolute;
  right: 22rpx;
  top: 50%;
  width: 16rpx;
  height: 16rpx;
  margin-top: -8rpx;
  background-color: var(--text-tertiary);
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpolyline points='4 6 8 10 12 6' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpolyline points='4 6 8 10 12 6' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

.form-placeholder {
  color: var(--text-quaternary);
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
  padding: 12rpx 0;
}

.switch-label {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.switch {
  display: flex;
  align-items: center;
  position: relative;
  width: 104rpx;
  height: 60rpx;
  padding: 4rpx;
  border-radius: var(--radius-pill);
  background: rgba(120, 120, 128, 0.28);
  box-sizing: border-box;
  transition: background 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.switch.is-on {
  background: var(--success);
}

.switch-dot {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: var(--bg-elevated);
  box-shadow: 0 2rpx 10rpx rgba(15, 23, 42, 0.12);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.switch.is-on .switch-dot {
  transform: translateX(44rpx);
}
</style>
