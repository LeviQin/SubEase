<template>
  <view class="subease-page">
    <view class="nav-bar" :style="navBarStyle">
      <text class="nav-title">{{ pageTitle }}</text>
    </view>

    <view class="page-body">
      <SubeaseHomeTab
        v-if="activeTab === 'home'"
        :summary="summaryStats"
        :upcoming-list="upcomingList"
        :amounts-hidden="amountsHidden"
        @toggle-amount="toggleAmountVisibility"
        @open-add="openAddSheet()"
        @open-detail="openDetailSheet"
      />

      <SubeaseSubscriptionsTab
        v-if="activeTab === 'subscriptions'"
        :subscriptions="visibleSubscriptions"
        :search-keyword="searchKeyword"
        :filter-category="filterCategory"
        :sort-order="sortOrder"
        :selected-ids="selectedIds"
        @update-search="updateSearch"
        @open-filter="openFilterSheet"
        @toggle-sort="toggleSort"
        @open-detail="openDetailSheet"
        @edit="openAddSheet"
        @delete="openDeleteSheet"
        @toggle-select="toggleSelect"
        @batch-delete="openBatchDeleteSheet"
        @clear-selection="clearSelection"
      />

      <SubeaseAnalyticsTab
        v-if="activeTab === 'analytics'"
        :analytics="analyticsSummary"
        :amounts-hidden="amountsHidden"
      />

      <SubeaseProfileTab
        v-if="activeTab === 'profile'"
        :logged-in="loggedIn"
        :profile="profile"
        :settings-remind-days="settingsRemindDays"
        :remind-days-label="profileRemindDaysLabel"
        :sync-profile-loading="syncProfileLoading"
        @request-login="openLoginSheet"
        @logout="logout"
        @sync-profile="openSyncProfileSheet"
        @action="onProfileAction"
        @change-remind-days="openRemindDaysSheet"
        @subscribe="requestSubscribeMessage"
      />
    </view>

    <SubeaseTabBar
      :active-tab="activeTab"
      @change="handleTabChange"
      @add="openAddSheet"
    />

    <view v-if="silentLoginLoading && !sheetState.visible" class="auth-loading-overlay">
      <view class="auth-loading-card">
        <view class="auth-spinner"></view>
        <text class="auth-loading-text">登录中...</text>
      </view>
    </view>

    <SubeaseSheet
      :visible="sheetState.visible"
      :title="sheetTitle"
      :footer-buttons="sheetFooterButtons"
      @close="closeSheet"
      @footer-action="onFooterAction"
    >
      <template v-if="sheetState.type === 'filter'">
        <view class="sheet-section-label">分类</view>
        <view class="chip-group">
          <view
            v-for="category in categoryOptions"
            :key="category"
            :class="['filter-chip', filterCategory === category ? 'is-active' : '']"
            @click="setFilterCategory(category)"
          >
            {{ category }}
          </view>
        </view>
      </template>

      <template v-else-if="sheetState.type === 'detail' && currentSubscription">
        <view class="detail-price-row">
          <text class="detail-price">{{ formatCurrency(currentSubscription.price, currentSubscription.currency) }}</text>
          <text class="detail-cycle">/ {{ currentSubscription.cycle }}</text>
        </view>
        <text class="detail-subtitle">
          {{ currentSubscription.category }} · {{ currentSubscription.autoRenew ? '自动续费' : '手动续费' }}
        </text>
        <view class="detail-grid">
          <view class="detail-row">
            <text class="detail-key">下次付款</text>
            <text class="detail-value">{{ formatShortDate(currentSubscription.nextDate) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-key">支付方式</text>
            <text class="detail-value">{{ currentSubscription.method || '未设置' }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-key">备注</text>
            <text class="detail-value">{{ currentSubscription.notes || '无' }}</text>
          </view>
        </view>
      </template>

      <template v-else-if="sheetState.type === 'confirm-delete'">
        <view class="confirm-copy">删除后将无法恢复。</view>
      </template>

      <template v-else-if="sheetState.type === 'batch-delete'">
        <view class="confirm-copy">删除选中的 {{ selectedIds.length }} 项订阅？</view>
      </template>

      <template v-else-if="sheetState.type === 'login' || sheetState.type === 'profile-sync'">
        <SubeaseWeChatProfileForm
          :avatar-preview="wechatProfileForm.avatarPreviewUrl"
          :nickname="wechatProfileForm.nickname"
          :disabled="loginLoading || syncProfileLoading || silentLoginLoading"
          :description="sheetState.type === 'login'
            ? '请填写微信头像和昵称，完成登录后会自动保存到账号。'
            : '更新后会同步保存到账号，用于展示头像和用户名。'"
          @choose-avatar="onWeChatAvatarChoose"
          @update:nickname="updateWeChatNickname"
        />
        <view v-if="sheetState.type === 'login'" class="agreement-tip">
          <text class="agreement-text" @click="openAgreement">登录即代表同意《用户服务协议》和《隐私政策》</text>
        </view>
      </template>

      <template v-else-if="sheetState.type === 'settings-picker'">
        <view class="picker-list">
          <view
            v-for="option in settingsPickerOptions"
            :key="option.value"
            :class="['picker-item', settingsPickerValue === option.value ? 'is-active' : '']"
            @click="onSettingsPickerSelect(option.value)"
          >
            <text class="picker-item-label">{{ option.label }}</text>
            <view v-if="settingsPickerValue === option.value" class="picker-item-check"></view>
          </view>
        </view>
      </template>

      <template v-else-if="sheetState.type === 'feedback'">
        <view class="form-field">
          <text class="form-label">反馈类型</text>
          <view class="option-group">
            <view
              v-for="item in ['功能建议', '问题反馈', '其他']"
              :key="item"
              :class="['option-chip', feedbackForm.type === item ? 'is-active' : '']"
              @click="feedbackForm.type = item"
            >
              {{ item }}
            </view>
          </view>
        </view>
        <view class="form-field">
          <text class="form-label">反馈内容</text>
          <textarea
            class="form-textarea"
            :value="feedbackForm.content"
            placeholder="请描述您的建议或遇到的问题..."
            placeholder-class="form-placeholder"
            maxlength="500"
            @input="feedbackForm.content = $event.detail.value"
          />
          <text class="form-count">{{ feedbackForm.content.length }}/500</text>
        </view>
        <view class="form-field">
          <text class="form-label">联系方式（选填）</text>
          <input
            class="form-input"
            :value="feedbackForm.contact"
            placeholder="微信 / 邮箱（选填）"
            placeholder-class="form-placeholder"
            @input="feedbackForm.contact = $event.detail.value"
          />
        </view>
      </template>

      <template v-else-if="sheetState.type === 'my-feedbacks'">
        <view v-if="myFeedbacksLoading" class="sheet-loading">
          <text class="sheet-loading-text">加载中...</text>
        </view>
        <view v-else-if="feedbackList.length" class="feedback-list">
          <view v-for="item in feedbackList" :key="item.id" class="feedback-item" @click="handleFeedbackRead(item)">
            <view class="feedback-item-head">
              <view class="feedback-item-head-left">
                <text class="feedback-type">{{ item.type }}</text>
                <text v-if="item.reply && !item.replyRead" class="feedback-new-badge">新回复</text>
              </view>
              <text :class="['feedback-status', `is-${item.status}`]">{{ feedbackStatusLabel(item.status) }}</text>
            </view>
            <text class="feedback-content">{{ item.content }}</text>
            <text v-if="item.reply" class="feedback-reply">官方回复：{{ item.reply }}</text>
            <text class="feedback-time">{{ formatFeedbackTime(item.createdAt) }}</text>
          </view>
        </view>
        <view v-else class="sheet-empty">
          <text class="sheet-empty-text">还没有反馈记录</text>
        </view>
      </template>

      <template v-else-if="sheetState.type === 'export'">
        <view v-if="exportLoading" class="sheet-loading">
          <text class="sheet-loading-text">{{ exportStatus }}</text>
        </view>
        <template v-else>
          <view class="export-tip-wrap">
            <text class="export-tip">将当前全部 {{ subscriptions.length }} 条订阅导出为 CSV 文件（仅本人可下载，30 分钟内有效）。</text>
            <text class="export-tip-sub">Android 将直接保存到手机文件；iOS 打开后点击右上角菜单选择保存。</text>
          </view>
        </template>
      </template>

      <template v-else-if="sheetState.type === 'form'">
        <view class="form-field">
          <text class="form-label">名称</text>
          <input
            class="form-input"
            :value="formState.name"
            placeholder="例如：Netflix"
            placeholder-class="form-placeholder"
            @input="updateFormField('name', $event.detail.value)"
          />
        </view>

        <view class="form-row">
          <view class="form-field flex-1">
            <text class="form-label">金额</text>
            <input
              class="form-input"
              type="digit"
              :value="String(formState.price)"
              placeholder="0.00"
              placeholder-class="form-placeholder"
              @input="updateFormField('price', $event.detail.value)"
            />
          </view>
          <view class="form-field compact-field">
            <text class="form-label">货币</text>
            <picker
              mode="selector"
              :range="currencyOptions"
              :value="currencyIndex"
              @change="onCurrencyChange"
            >
              <view class="form-input picker-input">{{ formState.currency }}</view>
            </picker>
          </view>
        </view>

        <view class="form-field">
          <text class="form-label">分类</text>
          <view class="option-group">
            <view
              v-for="item in categoryOptions"
              :key="item"
              :class="['option-chip', formState.category === item ? 'is-active' : '']"
              @click="updateFormField('category', item)"
            >
              {{ item }}
            </view>
          </view>
        </view>

        <view class="form-field">
          <text class="form-label">周期</text>
          <view class="option-group">
            <view
              v-for="item in ['月付', '季度付', '年付']"
              :key="item"
              :class="['option-chip', formState.cycle === item ? 'is-active' : '']"
              @click="updateFormField('cycle', item)"
            >
              {{ item }}
            </view>
          </view>
        </view>

        <view class="form-field">
          <text class="form-label">下次付款日</text>
          <picker mode="date" :value="formState.nextDate" @change="updateFormField('nextDate', $event.detail.value)">
            <view class="form-input picker-input">{{ formState.nextDate }}</view>
          </picker>
        </view>

        <view class="form-field">
          <text class="form-label">支付方式</text>
          <input
            class="form-input"
            :value="formState.method"
            placeholder="微信 / 支付宝 / 信用卡"
            placeholder-class="form-placeholder"
            @input="updateFormField('method', $event.detail.value)"
          />
        </view>

        <view class="switch-row">
          <text class="switch-label">自动续费</text>
          <view :class="['switch', formState.autoRenew ? 'is-on' : '']" @click="updateFormField('autoRenew', !formState.autoRenew)">
            <view class="switch-dot"></view>
          </view>
        </view>

        <view class="form-field">
          <text class="form-label">备注</text>
          <input
            class="form-input"
            :value="formState.notes"
            placeholder="选填"
            placeholder-class="form-placeholder"
            @input="updateFormField('notes', $event.detail.value)"
          />
        </view>
      </template>

    </SubeaseSheet>

    <SubeaseToast
      :visible="toastState.visible"
      :message="toastState.message"
    />
  </view>
</template>

<script>
import SubeaseAnalyticsTab from '@/components/subease/SubeaseAnalyticsTab.vue'
import SubeaseHomeTab from '@/components/subease/SubeaseHomeTab.vue'
import SubeaseProfileTab from '@/components/subease/SubeaseProfileTab.vue'
import SubeaseSheet from '@/components/subease/SubeaseSheet.vue'
import SubeaseSubscriptionsTab from '@/components/subease/SubeaseSubscriptionsTab.vue'
import SubeaseTabBar from '@/components/subease/SubeaseTabBar.vue'
import SubeaseToast from '@/components/subease/SubeaseToast.vue'
import SubeaseWeChatProfileForm from '@/components/subease/SubeaseWeChatProfileForm.vue'
import {
  cloneSubscription,
  createSubscriptionPayload,
  formatCurrency,
  formatShortDate,
  getAnalyticsSummary,
  getDaysUntil,
  getSummaryStats,
  getUpcomingSubscriptions,
  getVisibleSubscriptions
} from '@/utils/subease/helpers'
import { CATEGORY_OPTIONS, CURRENCY_OPTIONS, DEFAULT_PROFILE } from '@/utils/subease/mock'
import { createEmptyFormState, createInitialState } from '@/utils/subease/state'
import { useSubeaseAuthStore } from '@/stores/subease/auth'
import { updateProfile, wxLogin } from '@/api/subease/auth'
import {
  getSubscriptionList,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  batchDeleteSubscriptions,
  requestExport
} from '@/api/subease/subscription'
import { getFeedbackList, markFeedbackRead as markFeedbackReadApi, submitFeedback } from '@/api/subease/feedback'
import { getCurrencyRates } from '@/api/subease/rates'
import { reportSubscribeGrant } from '@/api/subease/notify'
import { SUBSCRIBE_TEMPLATE_ID } from '@/utils/subease/config'
import { track } from '@/utils/subease/track'
import { getApiBaseUrl } from '@/utils/subease/request'

export default {
  components: {
    SubeaseHomeTab,
    SubeaseSubscriptionsTab,
    SubeaseAnalyticsTab,
    SubeaseProfileTab,
    SubeaseTabBar,
    SubeaseSheet,
    SubeaseToast,
    SubeaseWeChatProfileForm
  },
  data() {
    return {
      ...createInitialState(),
      subscriptions: [],
      categoryOptions: CATEGORY_OPTIONS,
      currencyOptions: CURRENCY_OPTIONS,
      remindDaysOptions: [1, 3, 7, 15, 30],
      settingsRemindDays: this._loadRemindDays(),
      settingsPickerKey: '',
      toastTimer: null,
      statusBarHeight: 0,
      navBarHeight: 44,
      loginLoading: false,
      dataLoading: false,
      feedbackForm: {
        type: '',
        content: '',
        contact: ''
      },
      feedbackLoading: false,
      syncProfileLoading: false,
      wechatProfileForm: {
        nickname: '',
        avatarFilePath: '',
        avatarPreviewUrl: ''
      },
      rates: {},
      feedbackList: [],
      myFeedbacksLoading: false,
      exportData: {
        filename: '',
        url: ''
      },
      exportLoading: false
    }
  },
  created() {
    const systemInfo = uni.getSystemInfoSync()
    this.statusBarHeight = systemInfo.statusBarHeight || 20
    // #ifdef MP-WEIXIN
    const menuButtonInfo = uni.getMenuButtonBoundingClientRect()
    if (menuButtonInfo) {
      this.statusBarHeight = menuButtonInfo.top
      this.navBarHeight = menuButtonInfo.height + 8
    }
    // #endif
    this.loadRates()
  },
  onPullDownRefresh() {
    this.loadRates().finally(() => {
      this.fetchSubscriptions().finally(() => {
        uni.stopPullDownRefresh()
      })
    })
  },
  computed: {
    navBarStyle() {
      return {
        paddingTop: this.statusBarHeight + 'px',
        height: this.navBarHeight + 'px'
      }
    },
    pageTitle() {
      const titleMap = {
        home: '归期本',
        subscriptions: '全部订阅',
        analytics: '支出分析',
        profile: '我的'
      }
      return titleMap[this.activeTab] || '归期本'
    },
    summaryStats() {
      return getSummaryStats(this.subscriptions, this.rates)
    },
    upcomingList() {
      return getUpcomingSubscriptions(this.subscriptions, this.settingsRemindDays).map((item) => ({
        ...item,
        days: getDaysUntil(item.nextDate)
      }))
    },
    visibleSubscriptions() {
      return getVisibleSubscriptions(
        this.subscriptions,
        this.searchKeyword,
        this.filterCategory,
        this.sortOrder
      )
    },
    analyticsSummary() {
      return getAnalyticsSummary(this.subscriptions, this.rates)
    },
    sheetTitle() {
      const titleMap = {
        filter: '筛选',
        detail: this.currentSubscription?.name || '详情',
        'confirm-delete': '确认删除',
        'batch-delete': '批量删除',
        login: '微信登录',
        'profile-sync': '同步微信资料',
        'settings-picker': this.settingsPickerKey === 'currency' ? '默认货币' : '提前提醒',
        feedback: '意见反馈',
        'my-feedbacks': '我的反馈',
        export: '导出数据',
        form: this.formState.id ? '编辑订阅' : '新增订阅'
      }
      return titleMap[this.sheetState.type] || ''
    },
    currentSubscription() {
      const payloadId = this.sheetState.payload?.id
      return this.subscriptions.find((item) => item.id === payloadId) || null
    },
    currencyIndex() {
      return Math.max(0, this.currencyOptions.indexOf(this.formState.currency))
    },
    settingsPickerOptions() {
      if (this.settingsPickerKey === 'remind') {
        return this.remindDaysOptions.map((d) => ({
          value: d,
          label: `提前 ${d} 天`
        }))
      }
      return []
    },
    settingsPickerValue() {
      if (this.settingsPickerKey === 'remind') {
        return this.settingsRemindDays
      }
      return ''
    },
    profileRemindDaysLabel() {
      return `提前 ${this.settingsRemindDays} 天`
    },
    authReady() {
      const authStore = useSubeaseAuthStore()
      return authStore.authReady
    },
    silentLoginLoading() {
      const authStore = useSubeaseAuthStore()
      return authStore.silentLoginLoading
    },
    sessionExpired() {
      const authStore = useSubeaseAuthStore()
      return authStore.sessionExpired
    },
    loggedIn() {
      const authStore = useSubeaseAuthStore()
      return authStore.isLoggedIn
    },
    profile() {
      const authStore = useSubeaseAuthStore()
      return authStore.isLoggedIn
        ? {
            nickname: authStore.nickname,
            avatarText: authStore.avatarText,
            avatarUrl: authStore.avatarUrl,
            idText: authStore.userIdText
          }
        : { ...DEFAULT_PROFILE }
    },
    sheetFooterButtons() {
      const t = this.sheetState.type
      if (t === 'filter') {
        return [
          { key: 'clear-filter', text: '清除筛选', type: 'secondary' },
          { key: 'done', text: '完成', type: 'primary' }
        ]
      }
      if (t === 'detail') {
        return [
          { key: 'edit', text: '编辑', type: 'secondary' },
          { key: 'delete', text: '删除', type: 'danger' }
        ]
      }
      if (t === 'confirm-delete' || t === 'batch-delete') {
        return [
          { key: 'cancel', text: '取消', type: 'secondary' },
          { key: 'delete-confirm', text: '删除', type: 'danger' }
        ]
      }
      if (t === 'login') {
        const loading = this.loginLoading || this.silentLoginLoading
        return [
          { key: 'cancel-login', text: '取消', type: 'secondary', disabled: loading },
          { key: 'submit-wechat-profile', text: loading ? '登录中...' : '登录并同步', type: 'primary', disabled: loading }
        ]
      }
      if (t === 'profile-sync') {
        const loading = this.syncProfileLoading
        return [
          { key: 'cancel', text: '取消', type: 'secondary', disabled: loading },
          { key: 'submit-wechat-profile', text: loading ? '保存中...' : '保存资料', type: 'primary', disabled: loading }
        ]
      }
      if (t === 'feedback') {
        return [
          { key: 'cancel', text: '取消', type: 'secondary' },
          { key: 'submit-feedback', text: '提交', type: 'primary' }
        ]
      }
      if (t === 'my-feedbacks') {
        return [{ key: 'close', text: '关闭', type: 'secondary' }]
      }
      if (t === 'export') {
        const loading = this.exportLoading
        return [
          { key: 'close', text: '关闭', type: 'secondary', disabled: loading },
          { key: 'save-export', text: '生成并下载', type: 'primary', disabled: loading }
        ]
      }
      if (t === 'form') {
        return [
          { key: 'cancel', text: '取消', type: 'secondary' },
          { key: 'save', text: '保存', type: 'primary' }
        ]
      }
      return null
    }
  },
  watch: {
    settingsRemindDays(val) {
      this._saveRemindDays(val)
    },
    authReady: {
      handler(ready) {
        if (!ready) return
        if (this.loggedIn) {
          if (this.sheetState.type === 'login') this.closeSheet()
          this.fetchSubscriptions()
          return
        }
        this.subscriptions = []
      },
      immediate: true
    },
    loggedIn(val) {
      if (val) {
        if (this.loginLoading) return
        if (this.sheetState.type === 'login') this.closeSheet()
        this.fetchSubscriptions()
        return
      }
      if (!this.authReady) return
      this.subscriptions = []
      if (this.activeTab !== 'profile') {
        this.activeTab = 'profile'
      }
    }
  },
  beforeUnmount() {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer)
    }
  },
  methods: {
    resetWeChatProfileForm(options = {}) {
      const authStore = useSubeaseAuthStore()
      this.wechatProfileForm = {
        nickname: options.nickname ?? ((authStore.userInfo && authStore.userInfo.nickname) || ''),
        avatarFilePath: '',
        avatarPreviewUrl: options.avatarPreviewUrl ?? authStore.avatarUrl
      }
    },
    updateWeChatNickname(value) {
      this.wechatProfileForm = {
        ...this.wechatProfileForm,
        nickname: value
      }
    },
    onWeChatAvatarChoose(event) {
      const avatarUrl = event.detail && event.detail.avatarUrl ? event.detail.avatarUrl : ''
      if (!avatarUrl) return
      this.wechatProfileForm = {
        ...this.wechatProfileForm,
        avatarFilePath: avatarUrl,
        avatarPreviewUrl: avatarUrl
      }
    },
    getWeChatProfilePayload({ requireAvatar = true } = {}) {
      const nickname = (this.wechatProfileForm.nickname || '').trim()
      const avatarFilePath = this.wechatProfileForm.avatarFilePath || ''
      const avatarPreviewUrl = this.wechatProfileForm.avatarPreviewUrl || ''

      if (!nickname) {
        this.showToast('请输入微信昵称')
        return null
      }

      if (nickname.length < 2 || nickname.length > 16) {
        this.showToast('昵称需为 2-16 个字符')
        return null
      }

      if (requireAvatar && !avatarPreviewUrl) {
        this.showToast('请选择微信头像')
        return null
      }

      return {
        nickname,
        avatarFilePath: avatarFilePath || avatarPreviewUrl
      }
    },
    async getWeixinLoginCode() {
      return await new Promise((resolve, reject) => {
        // #ifdef MP-WEIXIN
        wx.login({
          success: (res) => {
            if (res.code) {
              resolve(res.code)
              return
            }
            reject(new Error('微信登录 code 获取失败'))
          },
          fail: reject
        })
        // #endif

        // #ifndef MP-WEIXIN
        uni.login({
          provider: 'weixin',
          success: (res) => {
            if (res.code) {
              resolve(res.code)
              return
            }
            reject(new Error('uni.login 未返回 code'))
          },
          fail: reject
        })
        // #endif
      })
    },
    requireLogin(options = {}) {
      if (this.loggedIn) return true
      if (this.silentLoginLoading) return false
      if (this.loginLoading) return false
      if (options.silent) return false
      this.showToast(this.sessionExpired ? '登录已失效，请重新登录' : '请先微信登录')
      this.activeTab = 'profile'
      this.openLoginSheet()
      return false
    },
    _loadRemindDays() {
      try {
        const val = uni.getStorageSync('subease-remind-days')
        const num = Number(val)
        return Number.isFinite(num) && num > 0 ? num : 3
      } catch {
        return 3
      }
    },
    _saveRemindDays(val) {
      try {
        uni.setStorageSync('subease-remind-days', val)
      } catch {
        // ignore
      }
    },
    async fetchSubscriptions() {
      if (!this.loggedIn) {
        this.subscriptions = []
        return
      }
      if (this.dataLoading) return
      this.dataLoading = true
      try {
        const list = await getSubscriptionList()
        this.subscriptions = list || []
      } catch (error) {
        console.error('[Subease] 获取订阅列表失败', error)
        this.subscriptions = []
      } finally {
        this.dataLoading = false
      }
    },
    formatCurrency,
    formatShortDate,
    handleTabChange(tab) {
      if (!this.loggedIn && tab !== 'profile') {
        this.requireLogin()
        return
      }
      this.activeTab = tab
    },
    toggleAmountVisibility() {
      this.amountsHidden = !this.amountsHidden
    },
    updateSearch(keyword) {
      this.searchKeyword = keyword
    },
    toggleSort() {
      this.sortOrder = this.sortOrder === 'date' ? 'price' : 'date'
    },
    toggleSelect(id) {
      const exists = this.selectedIds.includes(id)
      this.selectedIds = exists
        ? this.selectedIds.filter((item) => item !== id)
        : [...this.selectedIds, id]
    },
    clearSelection() {
      this.selectedIds = []
    },
    openSheet(type, payload = null) {
      this.sheetState = {
        visible: true,
        type,
        payload
      }
    },
    closeSheet() {
      this.sheetState = {
        visible: false,
        type: '',
        payload: null
      }
    },
    openFilterSheet() {
      this.openSheet('filter')
    },
    setFilterCategory(category) {
      this.filterCategory = this.filterCategory === category ? '' : category
    },
    clearFilter() {
      this.filterCategory = ''
      this.closeSheet()
    },
    openDetailSheet(id) {
      if (!this.requireLogin()) return
      this.openSheet('detail', { id })
    },
    openDeleteSheet(id) {
      if (!this.requireLogin()) return
      this.openSheet('confirm-delete', { id })
    },
    openBatchDeleteSheet() {
      if (!this.requireLogin()) return
      if (!this.selectedIds.length) {
        this.showToast('请先选择订阅')
        return
      }
      this.openSheet('batch-delete')
    },
    openLoginSheet() {
      if (this.loggedIn) return
      if (this.silentLoginLoading) return
      if (this.loginLoading) return
      if (this.sheetState.visible && this.sheetState.type === 'login') return
      this.resetWeChatProfileForm({ nickname: '', avatarPreviewUrl: '' })
      this.openSheet('login')
    },
    openSyncProfileSheet() {
      if (!this.requireLogin()) return
      if (this.syncProfileLoading) return
      this.resetWeChatProfileForm()
      this.openSheet('profile-sync')
    },
    openAddSheet(id = null) {
      if (!this.requireLogin()) return
      const current = id ? this.subscriptions.find((item) => item.id === id) : null
      this.formState = current
        ? cloneSubscription(current)
        : {
            ...createEmptyFormState(),
            category: this.filterCategory || '其他'
          }
      this.openSheet('form', { id })
    },
    updateFormField(field, value) {
      this.formState = {
        ...this.formState,
        [field]: value
      }
      if (field === 'cycle') {
        this.formState = {
          ...this.formState,
          nextDate: this._calcNextDate(value)
        }
      }
    },
    _calcNextDate(cycle) {
      // 以表单当前日期为基准，避免切换周期时覆盖用户已选日期
      const base = new Date(`${this.formState.nextDate}T00:00:00`)
      const target = new Date(base)
      if (cycle === '月付') {
        target.setMonth(target.getMonth() + 1)
      } else if (cycle === '季度付') {
        target.setMonth(target.getMonth() + 3)
      } else if (cycle === '年付') {
        target.setFullYear(target.getFullYear() + 1)
      }
      // 处理月末溢出：如 1月31日 +1月 → 应为 2月28/29日，而非 3月3日
      if (target.getDate() !== base.getDate()) {
        target.setDate(0)
      }
      const pad = (n) => String(n).padStart(2, '0')
      return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`
    },
    onCurrencyChange(event) {
      const index = Number(event.detail.value)
      this.updateFormField('currency', this.currencyOptions[index])
    },
    async saveForm() {
      if (!this.requireLogin()) return
      const payload = createSubscriptionPayload(this.formState, this.filterCategory)
      if (!payload.name) {
        this.showToast('请输入订阅名称')
        return
      }
      if (!payload.price || Number.isNaN(payload.price)) {
        this.showToast('请输入有效金额')
        return
      }
      try {
        if (payload.id && this.subscriptions.find((item) => item.id === payload.id)) {
          const updated = await updateSubscription(payload.id, payload)
          const idx = this.subscriptions.findIndex((item) => item.id === payload.id)
          if (idx >= 0) {
            const nextList = [...this.subscriptions]
            nextList.splice(idx, 1, updated)
            this.subscriptions = nextList
          }
          this.showToast('已更新')
        } else {
          const created = await createSubscription(payload)
          this.subscriptions = [created, ...this.subscriptions]
          this.showToast('已添加')
          track('subscribe_add', { currency: created.currency })
        }
        this.closeSheet()
      } catch (error) {
        this.showToast(error.message || '操作失败，请重试')
      }
    },
    async confirmDelete() {
      if (!this.requireLogin()) return
      const id = this.sheetState.payload?.id
      try {
        await deleteSubscription(id)
        this.subscriptions = this.subscriptions.filter((item) => item.id !== id)
        this.selectedIds = this.selectedIds.filter((item) => item !== id)
        this.closeSheet()
        this.showToast('已删除')
        track('subscribe_delete')
      } catch (error) {
        this.showToast(error.message || '删除失败，请重试')
      }
    },
    async confirmBatchDelete() {
      if (!this.requireLogin()) return
      try {
        await batchDeleteSubscriptions(this.selectedIds)
        this.subscriptions = this.subscriptions.filter((item) => !this.selectedIds.includes(item.id))
        this.selectedIds = []
        this.closeSheet()
        this.showToast('已删除')
        track('subscribe_batch_delete')
      } catch (error) {
        this.showToast(error.message || '批量删除失败，请重试')
      }
    },
    onProfileAction(action) {
      if (action === '反馈') {
        if (!this.requireLogin()) return
        this.openFeedbackSheet()
        return
      }
      if (action === '我的反馈') {
        if (!this.requireLogin()) return
        this.openMyFeedbacksSheet()
        return
      }
      if (action === '导出数据') {
        if (!this.requireLogin()) return
        this.openExportSheet()
        return
      }
      if (action === '关于') {
        uni.navigateTo({ url: '/pages/legal/index' })
        return
      }
      this.showToast(action)
    },
    openFeedbackSheet() {
      this.feedbackForm = { type: '功能建议', content: '', contact: '' }
      this.openSheet('feedback')
    },
    async submitFeedbackForm() {
      if (!this.requireLogin()) return
      if (!this.feedbackForm.type) {
        this.showToast('请选择反馈类型')
        return
      }
      if (!this.feedbackForm.content.trim()) {
        this.showToast('请填写反馈内容')
        return
      }
      this.feedbackLoading = true
      try {
        await submitFeedback({
          type: this.feedbackForm.type,
          content: this.feedbackForm.content.trim(),
          contact: this.feedbackForm.contact.trim()
        })
        track('feedback_submit', { type: this.feedbackForm.type })
        this.closeSheet()
        this.showToast('感谢反馈！')
      } catch (error) {
        this.showToast(error.message || '提交失败，请重试')
      } finally {
        this.feedbackLoading = false
      }
    },
    async handleFeedbackRead(item) {
      if (!item || !item.reply || item.replyRead) return
      // 先本地置为已读，接口失败静默（不影响浏览）
      item.replyRead = true
      try {
        await markFeedbackReadApi(item.id)
      } catch (error) {
        console.error('[Subease] 标记反馈已读失败', error)
      }
    },
    async openMyFeedbacksSheet() {
      this.openSheet('my-feedbacks')
      this.myFeedbacksLoading = true
      try {
        const list = await getFeedbackList()
        this.feedbackList = Array.isArray(list) ? list : []
      } catch (error) {
        console.error('[Subease] 获取反馈列表失败', error)
        this.feedbackList = []
      } finally {
        this.myFeedbacksLoading = false
      }
    },
    feedbackStatusLabel(status) {
      const map = {
        pending: '待处理',
        processing: '处理中',
        done: '已处理'
      }
      return map[status] || '待处理'
    },
    formatFeedbackTime(time) {
      if (!time) return ''
      const date = new Date(time)
      if (Number.isNaN(date.getTime())) return String(time || '')
      const pad = (n) => String(n).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    },
    openExportSheet() {
      this.exportData = { filename: '', url: '' }
      this.openSheet('export')
    },
    async exportCsvFile() {
      if (this.exportLoading) return
      if (!this.subscriptions.length) {
        this.showToast('暂无可导出的订阅数据')
        return
      }
      this.exportLoading = true
      this.exportStatus = '正在生成文件...'
      try {
        const result = await requestExport()
        if (!result || !result.url) throw new Error('导出文件生成失败')
        this.exportData = result
        await this.downloadExportFile(result.url)
        track('export_data')
      } catch (error) {
        console.error('[Subease] 导出失败', error)
        this.showToast(error.message || '导出失败，请重试')
      } finally {
        this.exportLoading = false
      }
    },
    downloadExportFile(relativeUrl) {
      return new Promise((resolve, reject) => {
        const authStore = useSubeaseAuthStore()
        // 后端返回相对路径，需拼接 API 域名；若为绝对地址则直接使用
        const url = /^https?:\/\//.test(relativeUrl) ? relativeUrl : getApiBaseUrl() + relativeUrl
        this.exportStatus = '正在下载文件...'
        uni.downloadFile({
          url,
          // 下载接口需要鉴权，需手动携带 accessToken（request 拦截器未覆盖 downloadFile）
          header: authStore.accessToken ? { Authorization: `Bearer ${authStore.accessToken}` } : {},
          success: (res) => {
            if (res.statusCode !== 200) {
              reject(new Error('导出文件下载失败'))
              return
            }
            const tempFilePath = res.tempFilePath
            // #ifdef MP-WEIXIN
            const systemInfo = uni.getSystemInfoSync()
            const platform = systemInfo.platform
            if (platform === 'devtools') {
              // 开发者工具无法真实保存/预览文件，提示用户用真机测试
              this.showToast('开发者工具不支持保存文件，请用真机预览测试导出')
              resolve()
            } else if (platform === 'android' && typeof wx.saveFileToDisk === 'function') {
              // Android：saveFileToDisk 直接保存到手机文件，无需打开
              wx.saveFileToDisk({
                filePath: tempFilePath,
                success: () => {
                  this.showToast('CSV 文件已保存到手机')
                  resolve()
                },
                fail: () => {
                  this.openDocumentFile(tempFilePath)
                  resolve()
                }
              })
            } else if (platform === 'ios') {
              // iOS 无直接保存 API，只能打开文件由用户手动保存
              this.openDocumentFile(tempFilePath)
              resolve()
            } else {
              this.showToast('当前环境不支持保存导出文件')
              resolve()
            }
            // #endif
            // #ifndef MP-WEIXIN
            this.openDocumentFile(tempFilePath)
            resolve()
            // #endif
          },
          fail: () => {
            reject(new Error('下载导出文件失败'))
          }
        })
      })
    },
    openDocumentFile(filePath) {
      uni.openDocument({
        filePath,
        showMenu: true,
        success: () => {
          this.showToast('文件已打开，可点击右上角菜单保存')
        },
        fail: () => {
          this.showToast('当前环境暂不支持打开文件')
        }
      })
    },
    async requestSubscribeMessage() {
      if (!this.requireLogin()) return
      if (!SUBSCRIBE_TEMPLATE_ID) {
        this.showToast('提醒推送暂未开放，敬请期待')
        return
      }
      try {
        // #ifdef MP-WEIXIN
        const res = await new Promise((resolve, reject) => {
          wx.requestSubscribeMessage({
            tmplIds: [SUBSCRIBE_TEMPLATE_ID],
            success: resolve,
            fail: reject
          })
        })
        const accepted = res && res[SUBSCRIBE_TEMPLATE_ID] === 'accept'
        await reportSubscribeGrant(!!accepted)
        if (accepted) {
          track('reminder_optin')
          this.showToast('到期提醒推送已开启')
        } else {
          this.showToast('未开启推送，可随时在设置中开启')
        }
        // #endif

        // #ifndef MP-WEIXIN
        this.showToast('仅微信小程序支持提醒推送')
        // #endif
      } catch (error) {
        console.error('[Subease] 订阅消息授权失败', error)
        this.showToast(error.message || '开启失败，请稍后重试')
      }
    },
    openAgreement() {
      uni.navigateTo({ url: '/pages/legal/agreement' })
    },
    async loadRates() {
      try {
        const rates = await getCurrencyRates()
        this.rates = rates || {}
      } catch (error) {
        console.error('[Subease] 获取汇率失败', error)
      }
    },
    async simulateLogin() {
      if (this.loginLoading) return
      const authStore = useSubeaseAuthStore()
      const profilePayload = this.getWeChatProfilePayload({ requireAvatar: true })
      if (!profilePayload) return
      this.loginLoading = true
      try {
        const code = await this.getWeixinLoginCode()
        const data = await wxLogin(code)
        authStore.setAuth({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          userInfo: data.userInfo
        })
        try {
          const profileData = await updateProfile(profilePayload)
          authStore.setUserInfo(profileData.userInfo)
        } catch (profileError) {
          console.error('[Subease] 登录后同步资料失败', profileError)
          this.fetchSubscriptions()
          this.closeSheet()
          this.showToast('登录成功，但资料同步失败，请稍后重试')
          return
        }
        this.fetchSubscriptions()
        this.closeSheet()
        this.showToast('登录成功')
        track('login_success')
        // 登录成功后引导开启到期提醒推送（不阻塞登录流程）
        if (SUBSCRIBE_TEMPLATE_ID) {
          this.requestSubscribeMessage()
        }
      } catch (error) {
        console.error('[Subease] 登录失败', error)
        this.showToast(error.message || '登录失败，请重试')
      } finally {
        this.loginLoading = false
      }
    },
    async syncWeChatProfile() {
      if (this.syncProfileLoading) return
      const authStore = useSubeaseAuthStore()
      const profilePayload = this.getWeChatProfilePayload({ requireAvatar: false })
      if (!profilePayload) return
      this.syncProfileLoading = true
      try {
        const data = await updateProfile(profilePayload)
        authStore.setUserInfo(data.userInfo)
        this.closeSheet()
        this.showToast('已同步')
      } catch (error) {
        this.showToast(error.message || '同步失败，请重试')
      } finally {
        this.syncProfileLoading = false
      }
    },
    logout() {
      const authStore = useSubeaseAuthStore()
      authStore.clearAuth({ manual: true })
      this.subscriptions = []
      this.filterCategory = ''
      this.selectedIds = []
      this.showToast('已退出')
    },
    showToast(message) {
      this.toastState = {
        visible: true,
        message
      }
      if (this.toastTimer) clearTimeout(this.toastTimer)
      this.toastTimer = setTimeout(() => {
        this.toastState = {
          visible: false,
          message: ''
        }
      }, 1800)
    },
    cancelLoginSheet() {
      this.closeSheet()
      this.showToast('需要微信登录才能使用')
    },
    onFooterAction(key) {
      const t = this.sheetState.type
      if (key === 'clear-filter') this.clearFilter()
      else if (key === 'done') this.closeSheet()
      else if (key === 'edit') this.openAddSheet(this.currentSubscription?.id)
      else if (key === 'delete') this.openDeleteSheet(this.currentSubscription?.id)
      else if (key === 'cancel' && (t === 'confirm-delete' || t === 'batch-delete' || t === 'form' || t === 'feedback' || t === 'profile-sync')) this.closeSheet()
      else if (key === 'delete-confirm' && t === 'confirm-delete') this.confirmDelete()
      else if (key === 'delete-confirm' && t === 'batch-delete') this.confirmBatchDelete()
      else if (key === 'cancel-login' && t === 'login') this.cancelLoginSheet()
      else if (key === 'submit-wechat-profile' && t === 'login') this.simulateLogin()
      else if (key === 'submit-wechat-profile' && t === 'profile-sync') this.syncWeChatProfile()
      else if (key === 'save') this.saveForm()
      else if (key === 'submit-feedback') this.submitFeedbackForm()
      else if (key === 'close') this.closeSheet()
      else if (key === 'save-export') this.exportCsvFile()
    },
    openRemindDaysSheet() {
      this.settingsPickerKey = 'remind'
      this.openSheet('settings-picker')
    },
    onSettingsPickerSelect(value) {
      if (this.settingsPickerKey === 'remind') {
        this.settingsRemindDays = value
        this.showToast(`提前 ${value} 天提醒`)
      }
      this.closeSheet()
    }
  }
}
</script>

<style scoped lang="scss">
.subease-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--app-bg);
}

.nav-bar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--frosted-surface);
  border-bottom: 1px solid var(--separator);
  box-sizing: content-box;
  backdrop-filter: saturate(180%) blur(24rpx);
}

.nav-bar::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 28rpx;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.46));
  pointer-events: none;
}

.nav-title {
  font-size: 33rpx;
  font-weight: 600;
  letter-spacing: -0.2rpx;
  color: var(--text-primary);
}

.page-body {
  flex: 1;
  min-height: 0;
  background:
    radial-gradient(circle at top center, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0)),
    var(--app-bg);
}

.auth-loading-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 35;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-overlay);
}

.auth-loading-card {
  display: flex;
  align-items: center;
  padding: 20rpx 28rpx;
  border-radius: var(--radius-pill);
  background: var(--frosted-surface);
  border: 1px solid var(--frosted-border);
  box-shadow: var(--shadow-raised);
  backdrop-filter: blur(16rpx);
}

.auth-spinner {
  width: 28rpx;
  height: 28rpx;
  margin-right: 14rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(87, 112, 255, 0.18);
  border-top-color: var(--accent);
  animation: authSpin 0.9s linear infinite;
}

.auth-loading-text {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-primary);
}

@keyframes authSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.sheet-section-label,
.form-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5rpx;
}

.chip-group,
.option-group {
  display: flex;
  flex-wrap: wrap;
  margin-right: -14rpx;
}

.chip-group .filter-chip,
.option-group .option-chip {
  margin-right: 14rpx;
  margin-bottom: 14rpx;
}

.filter-chip,
.option-chip {
  padding: 18rpx 28rpx;
  border-radius: var(--radius-pill);
  background: var(--bg-muted);
  font-size: 26rpx;
  font-weight: 500;
  color: var(--text-secondary);
}

.filter-chip.is-active,
.option-chip.is-active {
  background: var(--accent);
  color: var(--text-inverse);
  font-weight: 600;
  box-shadow: var(--shadow-xs);
}

.detail-price-row {
  display: flex;
  align-items: baseline;
  margin-bottom: 8rpx;
}

.detail-price {
  font-size: 56rpx;
  font-weight: 700;
  letter-spacing: -1rpx;
  color: var(--text-primary);
}

.detail-cycle {
  margin-left: 10rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: var(--text-secondary);
}

.detail-subtitle {
  display: block;
  margin-bottom: 28rpx;
  font-size: 26rpx;
  color: var(--text-tertiary);
}

.detail-grid {
  display: flex;
  flex-direction: column;
  padding: 24rpx;
  margin-bottom: 12rpx;
  background: var(--bg-subtle);
  border-radius: var(--radius-control);
}

.detail-grid .detail-row {
  margin-bottom: 20rpx;
}

.detail-grid .detail-row:last-child {
  margin-bottom: 0;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-key {
  font-size: 26rpx;
  color: var(--text-secondary);
}

.detail-value {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-primary);
}

.confirm-copy {
  padding: 24rpx 0 32rpx;
  font-size: 28rpx;
  line-height: 1.7;
  color: var(--text-secondary);
  text-align: center;
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

.form-textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 24rpx 28rpx;
  background: var(--bg-elevated);
  border: 1px solid var(--separator-strong);
  border-radius: var(--radius-control);
  font-size: 28rpx;
  color: var(--text-primary);
  box-sizing: border-box;
}

.form-textarea:focus {
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
}

.form-count {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
  text-align: right;
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

.sheet-btn {
  flex-grow: 1;
  flex-shrink: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 96rpx;
  margin-right: 16rpx;
  border-radius: 20rpx;
  font-size: 30rpx;
  font-weight: 600;
  letter-spacing: 0.3rpx;
}

.sheet-btn:last-child {
  margin-right: 0;
}

.sheet-btn:active {
  transform: scale(0.97);
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

.sheet-btn-secondary.danger {
  background: var(--danger-light);
  color: var(--danger);
}

.picker-list {
  display: flex;
  flex-direction: column;
}

.picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 28rpx;
  margin-bottom: 10rpx;
  border-radius: var(--radius-control);
  background: var(--bg-subtle);
}

.picker-list .picker-item:last-child {
  margin-bottom: 0;
}

.picker-item:active {
  background: var(--bg-muted);
}

.picker-item.is-active {
  background: var(--bg-accent);
}

.picker-item-label {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--text-primary);
}

.picker-item.is-active .picker-item-label {
  color: var(--accent);
  font-weight: 600;
}

.picker-item-check {
  width: 32rpx;
  height: 32rpx;
  background-color: var(--accent);
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpolyline points='3 8 7 12 13 4' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpolyline points='3 8 7 12 13 4' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center;
  mask-position: center;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

.agreement-tip {
  display: flex;
  justify-content: center;
  margin-top: 8rpx;
}

.agreement-text {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--text-tertiary);
  text-decoration: underline;
  text-align: center;
}

.sheet-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240rpx;
}

.sheet-loading-text {
  font-size: 28rpx;
  color: var(--text-tertiary);
}

.sheet-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240rpx;
}

.sheet-empty-text {
  font-size: 28rpx;
  color: var(--text-tertiary);
}

.feedback-list {
  max-height: 560rpx;
  overflow-y: auto;
}

.feedback-item {
  padding: 24rpx;
  margin-bottom: 16rpx;
  background: var(--bg-subtle);
  border-radius: var(--radius-control);
}

.feedback-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.feedback-item-head-left {
  display: flex;
  align-items: center;
}

.feedback-new-badge {
  padding: 2rpx 12rpx;
  margin-left: 12rpx;
  font-size: 20rpx;
  color: #fff;
  background: var(--danger, #fa5151);
  border-radius: 999rpx;
}

.feedback-type {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.feedback-status {
  padding: 6rpx 18rpx;
  border-radius: var(--radius-pill);
  font-size: 22rpx;
  font-weight: 600;
}

.feedback-status.is-pending {
  background: var(--warning-light);
  color: var(--warning);
}

.feedback-status.is-processing {
  background: var(--bg-accent);
  color: var(--accent);
}

.feedback-status.is-done {
  background: var(--success-light);
  color: var(--success);
}

.feedback-content {
  display: block;
  font-size: 28rpx;
  line-height: 1.6;
  color: var(--text-primary);
}

.feedback-reply {
  display: block;
  margin-top: 12rpx;
  padding: 16rpx 20rpx;
  background: var(--bg-muted);
  border-radius: var(--radius-control);
  font-size: 26rpx;
  line-height: 1.6;
  color: var(--text-secondary);
}

.feedback-time {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: var(--text-quaternary);
}

.export-tip-wrap {
  padding: 8rpx 8rpx 16rpx;
}

.export-tip {
  display: block;
  font-size: 26rpx;
  line-height: 1.6;
  color: var(--text-secondary);
}

.export-tip-sub {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
}
</style>
