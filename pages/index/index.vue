<template>
  <view class="subease-page">
    <view class="nav-bar" :style="navBarStyle">
      <text class="nav-title">{{ pageTitle }}</text>
    </view>

    <view class="page-body">
      <SubeaseHomeTab
        v-show="activeTab === 'home'"
        :summary="summaryStats"
        :upcoming-list="upcomingList"
        :health="health"
        :amounts-hidden="amountsHidden"
        @toggle-amount="toggleAmountVisibility"
        @open-add="openAddSheet()"
        @open-detail="openDetailSheet"
        @open-detail-suggestions="openHealthSheet"
      />

      <SubeaseSubscriptionsTab
        v-show="activeTab === 'subscriptions'"
        :subscriptions="visibleSubscriptions"
        :search-keyword="searchKeyword"
        :filter-category="filterCategory"
        :sort-order="sortOrder"
        :selected-ids="selectedIds"
        :loading="dataLoading && !subscriptions.length"
        @update-search="updateSearch"
        @open-filter="openFilterSheet"
        @toggle-sort="toggleSort"
        @open-detail="openDetailSheet"
        @edit="openAddSheet"
        @delete="openDeleteSheet"
        @toggle-select="toggleSelect"
        @batch-delete="openBatchDeleteSheet"
        @select-all="selectAll"
        @clear-selection="clearSelection"
      />

      <SubeaseAnalyticsTab
        v-show="activeTab === 'analytics'"
        :analytics="analyticsSummary"
        :monthly-trend="monthlyTrend"
        :week-expense="weekExpense"
        :amounts-hidden="amountsHidden"
      />

      <SubeaseProfileTab
        v-show="activeTab === 'profile'"
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
      :soon-count="soonCount"
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
      @close="handleSheetClose"
      @footer-action="onFooterAction"
    >
      <template v-if="sheetState.type === 'filter'">
        <view class="sheet-section-label">分类（带「自」标记的为自定义分类，可长按管理）</view>
        <view class="chip-group">
          <view
            v-for="category in categoryOptions"
            :key="category"
            :class="['filter-chip', filterCategory === category ? 'is-active' : '', customCategoryNames.has(category) ? 'is-custom' : '']"
            @click="setFilterCategory(category)"
            @longpress="handleFilterChipLongPress(category)"
          >
            {{ category }}
            <text v-if="customCategoryNames.has(category)" class="filter-chip-badge">自</text>
          </view>
          <view
            v-if="customCategories.length < MAX_CUSTOM_CATEGORIES"
            class="filter-chip filter-chip-add"
            @click="addCustomCategory"
          >＋ 新建</view>
        </view>
      </template>

      <template v-else-if="sheetState.type === 'manage-categories'">
        <view class="manage-cat-tip">自定义分类最多 {{ MAX_CUSTOM_CATEGORIES }} 个，已有 {{ customCategories.length }} 个</view>
        <view v-if="customCategories.length === 0" class="manage-cat-empty">
          <text class="manage-cat-empty-title">暂无自定义分类</text>
          <text class="manage-cat-empty-desc">注意：分类列表里带「自」标记的才是自定义分类；订阅中使用的分类会自动显示但不会计入，需通过「＋ 新建」添加后才能在这里管理。</text>
        </view>
        <view v-else class="manage-cat-list">
          <view v-for="cat in customCategories" :key="cat" class="manage-cat-item">
            <text class="manage-cat-name">{{ cat }}</text>
            <view class="manage-cat-actions">
              <view class="manage-cat-btn manage-cat-btn-edit" @click="editCustomCategory(cat)">修改</view>
              <view class="manage-cat-btn manage-cat-btn-del" @click="removeCustomCategory(cat)">删除</view>
            </view>
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
          <text v-if="currentSubscription.status === 'rolled'" class="status-tag status-tag--rolled">已自动续期</text>
          <text v-else-if="currentSubscription.status === 'expired'" class="status-tag status-tag--expired">已过期</text>
        </text>
        <view class="detail-grid">
          <view class="detail-row">
            <text class="detail-key">下次付款</text>
            <text class="detail-value">{{ formatShortDate(currentSubscription.displayDate || currentSubscription.nextDate) }}</text>
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
            <text class="export-tip">将当前全部 {{ subscriptions.length }} 条订阅导出为 Excel 文件（仅本人可下载，30 分钟内有效）。</text>
            <text class="export-tip-sub">Android 将直接保存到手机文件；iOS 打开后点击右上角菜单选择保存。</text>
          </view>
        </template>
      </template>

      <template v-else-if="sheetState.type === 'health'">
        <view class="health-sheet-score">
          <text class="health-sheet-score-num">{{ health.score }}</text>
          <text class="health-sheet-score-desc">满分 100，分数越高代表订阅管理越健康</text>
        </view>
        <view class="health-sheet-list">
          <view
            v-for="(item, index) in health.suggestions"
            :key="index"
            :class="['health-sheet-item', `is-${item.type}`]"
          >
            <view class="health-sheet-dot"></view>
            <text class="health-sheet-item-text">{{ item.text }}</text>
          </view>
        </view>
      </template>

      <template v-else-if="sheetState.type === 'preset'">
        <view class="preset-search">
          <view class="search-icon"></view>
          <input
            class="search-input"
            :value="presetKeyword"
            placeholder="搜索预设订阅"
            placeholder-class="search-placeholder"
            @input="onPresetSearch"
          />
        </view>
        <view class="preset-tip">点击条目预填信息，价格与下次付款日可按你的实际支付情况修改</view>
        <view class="preset-list">
          <view
            v-for="item in presetList"
            :key="item.name"
            :class="['preset-item', item.added ? 'is-added' : '']"
            @click="usePresetItem(item)"
          >
            <view class="preset-main">
              <text class="preset-name">{{ item.name }}</text>
              <text class="preset-meta">{{ item.category }} · {{ item.cycle }} · {{ formatCurrency(item.price, item.currency) }}</text>
            </view>
            <text class="preset-add">{{ item.added ? '已添加' : '使用' }}</text>
          </view>
        </view>
      </template>

      <template v-else-if="sheetState.type === 'import'">
        <view class="import-tip">支持直接粘贴「导出数据」生成的 CSV，或按模板填写：</view>
        <view class="import-example">名称,金额,货币,分类,周期,下次付款日,支付方式,自动续费,备注</view>
        <view class="import-example">Netflix,68,CNY,视频,月付,2026-09-01,微信,是,</view>
        <textarea
          class="import-textarea"
          :value="importText"
          placeholder="粘贴 CSV 内容（可含表头行）"
          placeholder-class="form-placeholder"
          @input="onImportInput"
        />
        <view class="import-actions">
          <view class="import-btn import-btn-secondary" @click="chooseImportFile">从聊天文件导入</view>
          <view class="import-btn import-btn-primary" @click="previewImport">解析预览</view>
        </view>
        <view v-if="importPreview" class="import-preview">
          <view class="import-preview-head">
            <text class="import-preview-ok">可导入 {{ importPreview.valid.length }} 条</text>
            <text v-if="importDuplicateCount" class="import-preview-warn">其中 {{ importDuplicateCount }} 条与现有订阅重名将跳过</text>
            <text v-if="importPreview.errors.length" class="import-preview-err">错误 {{ importPreview.errors.length }} 条</text>
          </view>
          <view v-for="(err, index) in importPreview.errors" :key="'err-' + index" class="import-error-item">{{ err }}</view>
        </view>
      </template>

      <template v-else-if="sheetState.type === 'form'">
        <SubeaseSubscriptionFormSheet
          :form="formState"
          :category-options="categoryOptions"
          :currency-options="currencyOptions"
          :currency-index="currencyIndex"
          :hide-add-category="customCategories.length >= MAX_CUSTOM_CATEGORIES"
          :custom-categories="customCategories"
          @update-field="onFormFieldUpdate"
          @currency-change="onCurrencyChange"
          @add-category="addCustomCategory"
          @manage-categories="openSheet('manage-categories', { returnTo: 'form' })"
          @open-preset="openPresetSheet"
        />
      </template>

    </SubeaseSheet>

    <SubeaseToast
      :visible="toastState.visible"
      :message="toastState.message"
      :top="toastTop"
    />
  </view>
</template>

<script>
import SubeaseAnalyticsTab from '@/components/subease/SubeaseAnalyticsTab.vue'
import SubeaseHomeTab from '@/components/subease/SubeaseHomeTab.vue'
import SubeaseProfileTab from '@/components/subease/SubeaseProfileTab.vue'
import SubeaseSheet from '@/components/subease/SubeaseSheet.vue'
import SubeaseSubscriptionFormSheet from '@/components/subease/SubeaseSubscriptionFormSheet.vue'
import SubeaseSubscriptionsTab from '@/components/subease/SubeaseSubscriptionsTab.vue'
import SubeaseTabBar from '@/components/subease/SubeaseTabBar.vue'
import SubeaseToast from '@/components/subease/SubeaseToast.vue'
import SubeaseWeChatProfileForm from '@/components/subease/SubeaseWeChatProfileForm.vue'
import {
  cloneSubscription,
  countUpcomingSoon,
  createSubscriptionPayload,
  formatCurrency,
  formatShortDate,
  getAnalyticsSummary,
  getDaysUntil,
  getMonthlyTrend,
  getSubscriptionHealth,
  getSummaryStats,
  getUpcomingSubscriptions,
  getVisibleSubscriptions,
  getWeekExpense,
  normalizeSubscriptions,
  parseSubscriptionsCsv,
  renameCustomCategory,
  validateCustomCategory
} from '@/utils/subease/helpers'
import {
  loadCustomCategories,
  loadRatesCache,
  loadSubscriptionsCache,
  saveCustomCategories,
  saveRatesCache,
  saveSubscriptionsCache,
  clearSubscriptionsCache
} from '@/utils/subease/cache'
import { CATEGORY_OPTIONS, CURRENCY_OPTIONS, DEFAULT_PROFILE, MAX_CUSTOM_CATEGORIES, POPULAR_SUBSCRIPTIONS } from '@/utils/subease/constants'
import { createEmptyFormState, createInitialState } from '@/utils/subease/state'
import { useSubeaseAuthStore, getWeixinLoginCode } from '@/stores/subease/auth'
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
    SubeaseSubscriptionFormSheet,
    SubeaseToast,
    SubeaseWeChatProfileForm
  },
  data() {
    return {
      ...createInitialState(),
      subscriptions: [],
      customCategories: [],
      currencyOptions: CURRENCY_OPTIONS,
      presetKeyword: '',
      remindDaysOptions: [1, 3, 7, 15, 30],
      settingsRemindDays: this._loadRemindDays(),
      settingsPickerKey: '',
      toastTimer: null,
      loginTimeoutId: null,
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
      exportLoading: false,
      importText: '',
      importPreview: null,
      importLoading: false
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
    this.customCategories = loadCustomCategories()
    this.loadRates()
  },
  onPullDownRefresh() {
    this.loadRates(true).finally(() => {
      this.fetchSubscriptions().finally(() => {
        uni.stopPullDownRefresh()
      })
    })
  },
  onShareAppMessage() {
    return {
      title: '归期本 · 订阅到期提醒，再也不忘续费',
      path: '/pages/index/index'
    }
  },
  onShareTimeline() {
    return {
      title: '归期本 · 订阅到期提醒，再也不忘续费'
    }
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
    toastTop() {
      // 自定义导航栏下方 12px 处展示，避免被导航栏遮挡
      return `${this.statusBarHeight + this.navBarHeight + 12}px`
    },
    summaryStats() {
      return getSummaryStats(this.subscriptions, this.rates)
    },
    upcomingList() {
      // days/displayDate/status 已在 normalizeSubscriptions 时计算好
      return getUpcomingSubscriptions(this.subscriptions, this.settingsRemindDays)
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
    monthlyTrend() {
      return getMonthlyTrend(this.subscriptions, this.rates, 6)
    },
    weekExpense() {
      return getWeekExpense(this.subscriptions, this.rates)
    },
    soonCount() {
      return countUpcomingSoon(this.subscriptions, 3)
    },
    health() {
      return getSubscriptionHealth(this.subscriptions)
    },
    categoryOptions() {
      // 动态合并：默认分类 + 自定义分类 + 订阅数据中已使用的其他分类（去重保序）
      const seen = new Set()
      const merged = []
      const push = (cat) => {
        const key = String(cat || '').trim()
        if (!key || seen.has(key)) return
        seen.add(key)
        merged.push(key)
      }
      CATEGORY_OPTIONS.forEach(push)
      this.customCategories.forEach(push)
      this.subscriptions.forEach((item) => push(item.category))
      return merged
    },
    customCategoryNames() {
      return new Set(this.customCategories)
    },
    presetList() {
      const keyword = (this.presetKeyword || '').trim().toLowerCase()
      const existing = new Set(this.subscriptions.map((item) => String(item.name || '').trim().toLowerCase()))
      return POPULAR_SUBSCRIPTIONS.filter((item) => {
        const matched = !keyword || String(item.name || '').toLowerCase().includes(keyword)
        return matched
      }).map((item) => ({
        ...item,
        added: existing.has(String(item.name || '').trim().toLowerCase())
      }))
    },
    importDuplicateCount() {
      if (!this.importPreview || !this.importPreview.valid.length) return 0
      const existing = new Set(this.subscriptions.map((item) => String(item.name || '').trim().toLowerCase()))
      return this.importPreview.valid.filter(
        (item) => existing.has(String(item.name || '').trim().toLowerCase())
      ).length
    },
    sheetTitle() {
      const titleMap = {
        filter: '筛选',
        'manage-categories': '管理自定义分类',
        detail: this.currentSubscription?.name || '详情',
        'confirm-delete': '确认删除',
        'batch-delete': '批量删除',
        login: '微信登录',
        'profile-sync': '同步微信资料',
        'settings-picker': this.settingsPickerKey === 'currency' ? '默认货币' : '提前提醒',
        feedback: '意见反馈',
        'my-feedbacks': '我的反馈',
        export: '导出数据',
        preset: '热门订阅预设库',
        health: '订阅健康建议',
        import: '批量导入',
        form: this.formState.id
          ? '编辑订阅'
          : this.sheetState.payload?.presetName
            ? `添加：${this.sheetState.payload.presetName}`
            : '新增订阅'
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
      if (t === 'manage-categories') {
        return [{ key: 'close', text: '关闭', type: 'secondary' }]
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
      if (t === 'import') {
        const canImport = this.importPreview && this.importPreview.valid.length > 0
        return [
          { key: 'cancel', text: '取消', type: 'secondary', disabled: this.importLoading },
          { key: 'import-confirm', text: this.importLoading ? '导入中...' : '确认导入', type: 'primary', disabled: !canImport }
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
    silentLoginLoading(loading) {
      if (this.loginTimeoutId) {
        clearTimeout(this.loginTimeoutId)
        this.loginTimeoutId = null
      }
      if (!loading) return
      // 登录遮罩超时兜底：8s 仍未完成时提示，避免用户无限等待
      this.loginTimeoutId = setTimeout(() => {
        this.loginTimeoutId = null
        if (!this.silentLoginLoading) return
        if (this.loggedIn) return
        this.showToast('登录较慢，请检查网络后稍等片刻')
      }, 8000)
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
    if (this.loginTimeoutId) {
      clearTimeout(this.loginTimeoutId)
      this.loginTimeoutId = null
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
    requireLogin(options = {}) {      if (this.loggedIn) return true
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
    async fetchSubscriptions(options = {}) {
      if (!this.loggedIn) {
        this.subscriptions = []
        return
      }
      if (this.dataLoading) return
      this.dataLoading = true
      try {
        // 先渲染本地缓存，弱网/离线场景也能秒开，避免请求期间白屏
        const cached = loadSubscriptionsCache()
        if (cached && cached.length) {
          this.subscriptions = normalizeSubscriptions(cached)
        }
        const list = await getSubscriptionList()
        const normalized = normalizeSubscriptions(list || [])
        this.subscriptions = normalized
        saveSubscriptionsCache(normalized)
      } catch (error) {
        console.error('[Subease] 获取订阅列表失败', error)
        const fallback = loadSubscriptionsCache()
        if (fallback && fallback.length) {
          this.subscriptions = normalizeSubscriptions(fallback)
          if (!options.silent) {
            this.showToast('网络异常，当前展示的是缓存数据')
          }
        } else {
          this.subscriptions = []
          if (!options.silent) {
            this.showToast(error.message || '获取订阅失败，请下拉重试')
          }
        }
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
    selectAll() {
      this.selectedIds = this.visibleSubscriptions.map((item) => item.id)
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
    // 弹层关闭：若从「添加订阅 / 筛选」进入分类管理面板，关闭后返回来源
    handleSheetClose() {
      const payload = this.sheetState.payload || {}
      if (this.sheetState.type === 'manage-categories' && payload.returnTo) {
        this.openSheet(payload.returnTo, payload.formPayload || null)
        return
      }
      this.closeSheet()
    },
    openFilterSheet() {
      this.openSheet('filter')
    },
    setFilterCategory(category) {
      this.filterCategory = this.filterCategory === category ? '' : category
    },
    addCustomCategory() {
      // 微信 showModal 支持 editable 输入（基础库 2.17.1+）
      // #ifndef MP-WEIXIN
      this.showToast('仅微信小程序支持自定义分类')
      return
      // #endif
      if (this.customCategories.length >= MAX_CUSTOM_CATEGORIES) {
        this.showToast(`最多可新增 ${MAX_CUSTOM_CATEGORIES} 个自定义分类`)
        return
      }
      const doAdd = (name) => {
        const result = validateCustomCategory(name, this.categoryOptions)
        if (!result.ok) {
          if (result.message) this.showToast(result.message)
          return
        }
        this.customCategories = [...this.customCategories, result.value]
        saveCustomCategories(this.customCategories)
        this.showToast(`已添加分类「${result.value}」`)
      }
      uni.showModal({
        title: '新建分类',
        editable: true,
        placeholderText: '例如：云存储',
        success: (res) => {
          if (res.confirm) doAdd(res.content)
        }
      })
    },
    // 筛选弹窗长按自定义分类：打开管理面板，返回时回到筛选弹窗
    handleFilterChipLongPress(category) {
      if (!this.customCategoryNames.has(category)) return
      this.openSheet('manage-categories', { returnTo: 'filter' })
    },
    editCustomCategory(category) {
      if (!this.customCategoryNames.has(category)) return
      // #ifndef MP-WEIXIN
      this.showToast('仅微信小程序支持自定义分类')
      return
      // #endif
      const doRename = (name) => {
        // 排除自身：改回原名或改到另一个名字时，重名校验只针对「其他分类」
        const others = this.categoryOptions.filter((item) => item !== category)
        const result = validateCustomCategory(name, others)
        if (!result.ok) {
          if (result.message) this.showToast(result.message)
          return
        }
        const renamed = result.value
        this.customCategories = renameCustomCategory(this.customCategories, category, renamed)
        saveCustomCategories(this.customCategories)
        // 正在筛选/编辑该分类时同步更新引用
        if (this.filterCategory === category) this.filterCategory = renamed
        if (this.formState.category === category) {
          this.formState = { ...this.formState, category: renamed }
        }
        this.showToast('分类已修改')
      }
      uni.showModal({
        title: '修改分类',
        editable: true,
        content: category,
        placeholderText: '分类名称',
        success: (res) => {
          if (res.confirm) doRename(res.content)
        }
      })
    },
    removeCustomCategory(category) {
      if (!this.customCategoryNames.has(category)) return
      uni.showModal({
        title: '删除分类',
        content: `确定删除分类「${category}」？已有订阅不受影响；若订阅中仍使用该分类，它会在分类列表中保留显示。`,
        confirmColor: '#FF3B30',
        success: (res) => {
          if (!res.confirm) return
          this.customCategories = this.customCategories.filter((item) => item !== category)
          saveCustomCategories(this.customCategories)
          if (this.filterCategory === category) this.filterCategory = ''
          if (this.formState.category === category) {
            this.formState = { ...this.formState, category: '' }
          }
          this.showToast('已删除分类')
        }
      })
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
    openPresetSheet() {
      if (!this.requireLogin()) return
      this.presetKeyword = ''
      this.openSheet('preset')
    },
    openHealthSheet() {
      if (!this.requireLogin()) return
      this.openSheet('health')
    },
    openImportSheet() {
      if (!this.requireLogin()) return
      this.importText = ''
      this.importPreview = null
      this.openSheet('import')
    },
    onImportInput(event) {
      this.importText = event.detail.value
      this.importPreview = null
    },
    previewImport() {
      if (!this.importText.trim()) {
        this.showToast('请先粘贴 CSV 内容')
        return
      }
      this.importPreview = parseSubscriptionsCsv(this.importText)
    },
    chooseImportFile() {
      // #ifdef MP-WEIXIN
      wx.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['csv', 'txt'],
        success: (res) => {
          const file = res.tempFiles && res.tempFiles[0]
          if (!file) return
          const fs = uni.getFileSystemManager()
          try {
            const content = fs.readFileSync(file.path, 'utf8')
            this.importText = content
            this.importPreview = null
            this.showToast('已读取文件，点击解析预览')
          } catch (error) {
            console.error('[Subease] 读取导入文件失败', error)
            this.showToast('读取文件失败，请手动粘贴内容')
          }
        },
        fail: () => {}
      })
      // #endif
      // #ifndef MP-WEIXIN
      this.showToast('仅微信小程序支持从聊天文件导入')
      // #endif
    },
    async confirmImport() {
      if (!this.importPreview || !this.importPreview.valid.length) return
      if (this.importLoading) return
      // 跳过与现有订阅重名的条目，避免重复数据
      const existing = new Set(this.subscriptions.map((item) => String(item.name || '').trim().toLowerCase()))
      const toImport = this.importPreview.valid.filter(
        (item) => !existing.has(String(item.name || '').trim().toLowerCase())
      )
      const skipped = this.importPreview.valid.length - toImport.length
      if (!toImport.length) {
        this.showToast('所有条目均与现有订阅重名')
        return
      }
      this.importLoading = true
      let count = 0
      try {
        for (const item of toImport) {
          const payload = createSubscriptionPayload({ ...createEmptyFormState(), ...item }, '')
          await createSubscription(payload)
          count += 1
        }
        await this.fetchSubscriptions()
        this.closeSheet()
        this.showToast(`已导入 ${count} 条${skipped ? `，跳过 ${skipped} 条重名` : ''}`)
        track('subscribe_batch_import', { count, skipped })
      } catch (error) {
        console.error('[Subease] 批量导入失败', error)
        this.showToast(error.message || '导入失败，请重试')
      } finally {
        this.importLoading = false
      }
    },
    usePresetItem(item) {
      if (!this.requireLogin()) return
      if (item.added) {
        this.showToast('该订阅已在列表中，可在「全部订阅」中编辑')
        return
      }
      // 预填表单：预设价格/周期仅为参考，用户可按实际支付情况修改后保存
      this.formState = {
        ...createEmptyFormState(),
        name: item.name,
        price: item.price,
        currency: item.currency,
        cycle: item.cycle,
        category: item.category,
        autoRenew: item.autoRenew
      }
      this.openSheet('form', { presetName: item.name })
    },
    onPresetSearch(event) {
      this.presetKeyword = event.detail.value
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
    onFormFieldUpdate(payload) {
      if (!payload) return
      this.updateFormField(payload.field, payload.value)
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
            this.subscriptions = normalizeSubscriptions(nextList)
            saveSubscriptionsCache(this.subscriptions)
          }
          this.showToast('已更新')
        } else {
          const created = await createSubscription(payload)
          this.subscriptions = normalizeSubscriptions([created, ...this.subscriptions])
          saveSubscriptionsCache(this.subscriptions)
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
        this.subscriptions = normalizeSubscriptions(this.subscriptions.filter((item) => item.id !== id))
        saveSubscriptionsCache(this.subscriptions)
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
        this.subscriptions = normalizeSubscriptions(
          this.subscriptions.filter((item) => !this.selectedIds.includes(item.id))
        )
        saveSubscriptionsCache(this.subscriptions)
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
      if (action === '年度账单报告') {
        if (!this.requireLogin()) return
        uni.navigateTo({ url: '/pages/report/annual' })
        return
      }
      if (action === '批量导入') {
        if (!this.requireLogin()) return
        this.openImportSheet()
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
    async exportXlsxFile() {
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
        const isAbsolute = /^https?:\/\//.test(relativeUrl)
        const url = isAbsolute ? relativeUrl : getApiBaseUrl() + relativeUrl
        this.exportStatus = '正在下载文件...'
        uni.downloadFile({
          url,
          header: !isAbsolute && authStore.accessToken ? { Authorization: `Bearer ${authStore.accessToken}` } : {},
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
                  this.showToast('Excel 文件已保存到手机')
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
        await reportSubscribeGrant(!!accepted, 'reminder')
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
        // 微信限制订阅授权必须由用户点击手势触发，收到此类错误时给出友好提示
        const raw = String((error && (error.errMsg || error.message)) || '')
        if (/TAP gesture|user gesture|requestSubscribeMessage:fail/i.test(raw)) {
          this.showToast('请点击「开启到期提醒推送」按钮触发')
        } else {
          this.showToast(error.message || '开启失败，请稍后重试')
        }
      }
    },
    openAgreement() {
      uni.navigateTo({ url: '/pages/legal/agreement' })
    },
    async loadRates(force = false) {
      try {
        if (!force) {
          const cached = loadRatesCache()
          if (cached) {
            this.rates = cached
            return
          }
        }
        const rates = await getCurrencyRates()
        this.rates = rates || {}
        saveRatesCache(this.rates)
      } catch (error) {
        console.error('[Subease] 获取汇率失败', error)
      }
    },
    async handleLogin() {
      if (this.loginLoading) return
      const authStore = useSubeaseAuthStore()
      const profilePayload = this.getWeChatProfilePayload({ requireAvatar: true })
      if (!profilePayload) return
      this.loginLoading = true
      try {
        const code = await getWeixinLoginCode()
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
        // 注意：不在登录后自动请求订阅消息授权。
        // 微信要求 requestSubscribeMessage 必须由用户主动点击手势触发，
        // 异步回调中调用会被拒绝（fail can only be invoked by user TAP gesture）。
        // 用户可在「我的」页通过「开启到期提醒推送」入口主动开启。
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
      clearSubscriptionsCache()
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
      else if (key === 'submit-wechat-profile' && t === 'login') this.handleLogin()
      else if (key === 'submit-wechat-profile' && t === 'profile-sync') this.syncWeChatProfile()
      else if (key === 'save') this.saveForm()
      else if (key === 'submit-feedback') this.submitFeedbackForm()
      else if (key === 'close') {
        const returnTo =
          t === 'manage-categories' ? this.sheetState.payload?.returnTo : null
        if (returnTo) {
          this.openSheet(returnTo)
        } else {
          this.closeSheet()
        }
      }
      else if (key === 'save-export') this.exportXlsxFile()
      else if (key === 'import-confirm' && t === 'import') this.confirmImport()
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
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), var(--nav-fade));
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
    radial-gradient(circle at top center, var(--page-glow), rgba(255, 255, 255, 0)),
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
  display: inline-flex;
  align-items: center;
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

.filter-chip-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30rpx;
  height: 30rpx;
  margin-left: 8rpx;
  padding: 0 6rpx;
  border-radius: var(--radius-full);
  font-size: 18rpx;
  font-weight: 700;
  line-height: 1;
  color: var(--accent);
  background: var(--bg-accent);
}

.filter-chip.is-active .filter-chip-badge {
  color: var(--accent);
  background: rgba(255, 255, 255, 0.9);
}

.filter-chip-add {
  border: 1px dashed var(--separator-strong);
  background: transparent;
  color: var(--accent);
  font-weight: 600;
}

.manage-cat-tip {
  margin-bottom: 20rpx;
  font-size: 24rpx;
  color: var(--text-tertiary);
}

.manage-cat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 40rpx;
  text-align: center;
}

.manage-cat-empty-title {
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.manage-cat-empty-desc {
  font-size: 24rpx;
  line-height: 1.7;
  color: var(--text-tertiary);
}

.manage-cat-list {
  display: flex;
  flex-direction: column;
}

.manage-cat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 8rpx;
  border-bottom: 1px solid var(--separator);
}

.manage-cat-item:last-child {
  border-bottom: none;
}

.manage-cat-name {
  font-size: 30rpx;
  font-weight: 500;
  color: var(--text-primary);
}

.manage-cat-actions {
  display: flex;
  align-items: center;
}

.manage-cat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 104rpx;
  height: 60rpx;
  margin-left: 16rpx;
  padding: 0 24rpx;
  border-radius: var(--radius-control);
  font-size: 26rpx;
  font-weight: 600;
}

.manage-cat-btn-edit {
  background: var(--bg-accent);
  color: var(--accent);
}

.manage-cat-btn-del {
  background: var(--danger-light);
  color: var(--danger);
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

.status-tag {
  display: inline-block;
  padding: 4rpx 14rpx;
  margin-left: 12rpx;
  border-radius: var(--radius-pill);
  font-size: 20rpx;
  font-weight: 600;
  vertical-align: 2rpx;
}

.status-tag--rolled {
  background: var(--success-light);
  color: var(--success);
}

.status-tag--expired {
  background: var(--danger-light);
  color: var(--danger);
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

.preset-search {
  display: flex;
  align-items: center;
  height: 80rpx;
  padding: 0 24rpx;
  margin-bottom: 20rpx;
  background: var(--bg-elevated);
  border: 1px solid var(--separator);
  border-radius: var(--radius-control);
  box-shadow: var(--shadow-card);
}

.preset-search:focus-within {
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

.preset-tip {
  margin-bottom: 16rpx;
  font-size: 22rpx;
  line-height: 1.5;
  color: var(--text-tertiary);
}

.preset-list {
  display: flex;
  flex-direction: column;
}

.preset-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 104rpx;
  padding: 0 28rpx;
  margin-bottom: 12rpx;
  background: var(--bg-subtle);
  border-radius: var(--radius-control);
}

.preset-item:active {
  background: var(--bg-muted);
}

.preset-item.is-added {
  opacity: 0.55;
}

.preset-main {
  flex: 1;
  min-width: 0;
  margin-right: 20rpx;
}

.preset-name {
  display: block;
  margin-bottom: 6rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.preset-meta {
  font-size: 22rpx;
  color: var(--text-secondary);
}

.preset-add {
  flex-shrink: 0;
  padding: 12rpx 26rpx;
  border-radius: var(--radius-pill);
  background: var(--accent);
  color: var(--text-inverse);
  font-size: 24rpx;
  font-weight: 600;
}

.preset-item.is-added .preset-add {
  background: var(--bg-muted);
  color: var(--text-tertiary);
}

.health-sheet-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0 32rpx;
}

.health-sheet-score-num {
  font-size: 96rpx;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -2rpx;
  color: var(--accent);
}

.health-sheet-score-desc {
  margin-top: 14rpx;
  font-size: 24rpx;
  color: var(--text-tertiary);
}

.health-sheet-list {
  display: flex;
  flex-direction: column;
}

.health-sheet-item {
  display: flex;
  align-items: flex-start;
  padding: 26rpx 28rpx;
  margin-bottom: 14rpx;
  background: var(--bg-subtle);
  border-radius: var(--radius-control);
}

.health-sheet-dot {
  flex-shrink: 0;
  width: 16rpx;
  height: 16rpx;
  margin: 10rpx 18rpx 0 0;
  border-radius: 50%;
  background: var(--warning);
}

.health-sheet-item.is-danger .health-sheet-dot {
  background: var(--danger);
}

.health-sheet-item.is-info .health-sheet-dot {
  background: var(--accent);
}

.health-sheet-item-text {
  flex: 1;
  font-size: 26rpx;
  line-height: 1.6;
  color: var(--text-primary);
}

.import-tip {
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--text-secondary);
}

.import-example {
  margin-top: 8rpx;
  padding: 14rpx 20rpx;
  background: var(--bg-subtle);
  border-radius: var(--radius-control);
  font-size: 22rpx;
  color: var(--text-tertiary);
  font-family: var(--font-mono, monospace);
}

.import-textarea {
  width: 100%;
  min-height: 240rpx;
  padding: 24rpx 28rpx;
  margin-top: 20rpx;
  background: var(--bg-elevated);
  border: 1px solid var(--separator-strong);
  border-radius: var(--radius-control);
  font-size: 26rpx;
  color: var(--text-primary);
  box-sizing: border-box;
}

.import-textarea:focus {
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
}

.import-actions {
  display: flex;
  margin-top: 20rpx;
}

.import-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: var(--radius-control);
  font-size: 26rpx;
  font-weight: 600;
}

.import-btn-secondary {
  margin-right: 16rpx;
  background: var(--bg-muted);
  color: var(--text-primary);
}

.import-btn-primary {
  background: var(--accent);
  color: var(--text-inverse);
}

.import-btn:active {
  transform: scale(0.98);
}

.import-preview {
  margin-top: 24rpx;
  padding: 22rpx 24rpx;
  background: var(--bg-subtle);
  border-radius: var(--radius-control);
}

.import-preview-head {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.import-preview-ok {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--success);
}

.import-preview-err {
  margin-left: 20rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--danger);
}

.import-preview-warn {
  margin-left: 20rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--warning);
}

.import-error-item {
  padding: 8rpx 0;
  font-size: 22rpx;
  line-height: 1.5;
  color: var(--danger);
}
</style>
