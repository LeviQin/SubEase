<script>
	import { useSubeaseAuthStore } from '@/stores/subease/auth'
	import { track } from '@/utils/subease/track'

	export default {
		onLaunch: function() {
			console.log('App Launch')
			const authStore = useSubeaseAuthStore()
			authStore.hydrate()
			authStore.wxSilentLogin()
				.then(() => {
					if (authStore.isLoggedIn) {
						track('app_launch')
					}
				})
				.catch((error) => {
					console.warn('[App] 静默登录失败，用户未登录', error.message)
				})
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style lang="scss">
	/* 全局重置 — 针对 uni-app 默认样式 */
	page,
	view,
	text,
	scroll-view,
	button,
	input {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	/* ── Design Tokens（CSS 变量）──
	   定义在 page 上：微信小程序 wxss 不支持 :root，
	   且 uni.scss 注入组件时会被附加 scoped 属性（page.data-v-xxx 无法命中），
	   因此统一在此定义，编译进 app.wxss，可被所有页面与组件继承。 */
	page {
		--app-bg: #{$bg-root};
		--bg-grouped: #{$bg-grouped};
		--bg-elevated: #{$bg-elevated};
		--bg-subtle: #{$bg-subtle};
		--bg-muted: #{$bg-muted};
		--bg-overlay: #{$bg-overlay};
		--bg-accent: #{$color-accent-soft};

		--text-primary: #{$text-primary};
		--text-secondary: #{$text-secondary};
		--text-tertiary: #{$text-tertiary};
		--text-quaternary: #{$text-quaternary};
		--text-inverse: #{$text-inverse};

		--accent: #{$color-accent};
		--accent-dark: #{$color-accent-dark};
		--accent-light: #{$color-accent-soft};
		--warning: #{$color-warning};
		--danger: #{$color-danger};
		--danger-light: #{$color-danger-soft};
		--success: #{$color-success};
		--success-light: #{$color-success-soft};
		--warning-light: #{$color-warning-soft};

		--separator: #{$border-light};
		--separator-strong: #{$border-medium};
		--separator-heavy: #{$border-strong};

		--radius-xs: #{$radius-xs};
		--radius-sm: #{$radius-sm};
		--radius-md: #{$radius-md};
		--radius-lg: #{$radius-lg};
		--radius-xl: #{$radius-xl};
		--radius-sheet: #{$radius-sheet};
		--radius-full: #{$radius-full};

		--radius-card: #{$radius-lg};
		--radius-control: #{$radius-sm};
		--radius-pill: #{$radius-full};

		--shadow-xs: #{$shadow-xs};
		--shadow-sm: #{$shadow-sm};
		--shadow-md: #{$shadow-md};
		--shadow-lg: #{$shadow-lg};
		--shadow-xl: #{$shadow-xl};
		--shadow-card: #{$shadow-xs};
		--shadow-raised: #{$shadow-sm};
		--shadow-modal: #{$shadow-lg};
		--focus-ring: 0 0 0 6rpx rgba(87, 112, 255, 0.12);
		--frosted-surface: rgba(255, 255, 255, 0.78);
		--frosted-border: rgba(255, 255, 255, 0.52);
		--page-gutter: 36rpx;
		--content-bottom-space: calc(132rpx + env(safe-area-inset-bottom, 0px));

		--transition-fast: #{$duration-fast} #{$ease-out};
		--transition-normal: #{$duration-normal} #{$ease-out};
		--transition-slow: #{$duration-slow} #{$ease-out};
	}

	@media (min-width: 768px) {
		page {
			--content-bottom-space: calc(132rpx + env(safe-area-inset-bottom, 0px));
		}
	}

	button {
		margin: 0;
		padding: 0;
		border: 0;
		line-height: 1;
	}

	button::after {
		border: 0;
	}

	page {
		min-height: 100%;
		background: var(--app-bg);
		color: var(--text-primary);
		font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text",
			"PingFang SC", "Microsoft YaHei", sans-serif;
	}

	::-webkit-scrollbar {
		display: none;
		width: 0;
		height: 0;
	}
</style>
