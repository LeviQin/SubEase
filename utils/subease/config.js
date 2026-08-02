// SubEase 全局配置（集中管理常量，避免散落硬编码）
export const API_BASE_URL = {
  // 微信小程序真机/线上环境
  MP_WEIXIN: 'https://api.leviqin.top/api',
  // 本地开发环境
  LOCAL: 'http://127.0.0.1:3000/api'
}

// 微信订阅消息模板 ID（类目：记账，标题：会员到期通知）
export const SUBSCRIBE_TEMPLATE_ID = '2XJaY3EyaeAkKnBOdbL_7T0D-rF28xhMkH21IhT0vwk'

// 订阅消息模板字段约定（需与公众平台模板字段一致）
export const SUBSCRIBE_FIELDS = ['thing4', 'time2', 'number3']
