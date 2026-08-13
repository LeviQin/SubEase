// 全局常量（分类 / 货币 / 默认资料）
// 注意：货币符号映射统一在 helpers.js 维护，此处不重复定义

export const CATEGORY_OPTIONS = ['视频', '音乐', '工具', '其他']

export const CURRENCY_OPTIONS = ['CNY', 'USD', 'EUR', 'JPY', 'GBP', 'HKD', 'KRW', 'AUD']

export const DEFAULT_PROFILE = {
  nickname: '请微信登录',
  avatarText: 'USER',
  avatarUrl: '',
  idText: ''
}

// 热门订阅预设库：一键添加，用户可按实际价格修改
// 字段：name / price / currency / cycle / category / autoRenew
export const POPULAR_SUBSCRIPTIONS = [
  { name: '爱奇艺 VIP', price: 25, currency: 'CNY', cycle: '月付', category: '视频', autoRenew: true },
  { name: '腾讯视频 VIP', price: 30, currency: 'CNY', cycle: '月付', category: '视频', autoRenew: true },
  { name: '优酷 VIP', price: 25, currency: 'CNY', cycle: '月付', category: '视频', autoRenew: true },
  { name: '芒果 TV 会员', price: 25, currency: 'CNY', cycle: '月付', category: '视频', autoRenew: true },
  { name: '哔哩哔哩大会员', price: 25, currency: 'CNY', cycle: '月付', category: '视频', autoRenew: true },
  { name: 'Netflix', price: 68, currency: 'CNY', cycle: '月付', category: '视频', autoRenew: true },
  { name: 'Disney+', price: 58, currency: 'CNY', cycle: '月付', category: '视频', autoRenew: true },
  { name: 'YouTube Premium', price: 15, currency: 'USD', cycle: '月付', category: '视频', autoRenew: true },
  { name: '网易云音乐', price: 15, currency: 'CNY', cycle: '月付', category: '音乐', autoRenew: true },
  { name: 'QQ 音乐', price: 15, currency: 'CNY', cycle: '月付', category: '音乐', autoRenew: true },
  { name: 'Spotify', price: 15, currency: 'USD', cycle: '月付', category: '音乐', autoRenew: true },
  { name: 'Apple Music', price: 10, currency: 'USD', cycle: '月付', category: '音乐', autoRenew: true },
  { name: 'iCloud+ 50GB', price: 6, currency: 'CNY', cycle: '月付', category: '工具', autoRenew: true },
  { name: '微信读书', price: 19, currency: 'CNY', cycle: '月付', category: '工具', autoRenew: true },
  { name: '百度网盘会员', price: 30, currency: 'CNY', cycle: '月付', category: '工具', autoRenew: true },
  { name: 'WPS 会员', price: 15, currency: 'CNY', cycle: '月付', category: '工具', autoRenew: true },
  { name: 'Notion Plus', price: 10, currency: 'USD', cycle: '月付', category: '工具', autoRenew: true },
  { name: 'ChatGPT Plus', price: 20, currency: 'USD', cycle: '月付', category: '工具', autoRenew: true },
  { name: 'Claude Pro', price: 20, currency: 'USD', cycle: '月付', category: '工具', autoRenew: true },
  { name: 'GitHub Copilot', price: 10, currency: 'USD', cycle: '月付', category: '工具', autoRenew: true },
  { name: 'JetBrains 全家桶', price: 289, currency: 'CNY', cycle: '年付', category: '工具', autoRenew: true },
  { name: 'Xbox Game Pass', price: 29, currency: 'CNY', cycle: '月付', category: '其他', autoRenew: true },
  { name: 'Nintendo Switch Online', price: 65, currency: 'CNY', cycle: '年付', category: '其他', autoRenew: true },
  { name: 'Plex 会员', price: 5, currency: 'USD', cycle: '月付', category: '视频', autoRenew: true },
  { name: 'Amazon Prime', price: 129, currency: 'CNY', cycle: '年付', category: '视频', autoRenew: true },
  { name: 'Apple One', price: 68, currency: 'CNY', cycle: '月付', category: '工具', autoRenew: true },
  { name: 'Dropbox Plus', price: 12, currency: 'USD', cycle: '月付', category: '工具', autoRenew: true },
  { name: 'Evernote 专业版', price: 12, currency: 'USD', cycle: '月付', category: '工具', autoRenew: true },
  { name: '夸克网盘会员', price: 20, currency: 'CNY', cycle: '月付', category: '工具', autoRenew: true },
  { name: '喜马拉雅会员', price: 25, currency: 'CNY', cycle: '月付', category: '音乐', autoRenew: true },
  { name: '得到 App 会员', price: 365, currency: 'CNY', cycle: '年付', category: '工具', autoRenew: true },
  { name: 'Keep 会员', price: 25, currency: 'CNY', cycle: '月付', category: '其他', autoRenew: true }
]
