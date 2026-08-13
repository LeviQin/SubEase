import { request } from '../../utils/subease/request'

// 上报微信订阅消息授权结果（accept 为 true 时后端对应类型额度 +1）
// type: 'reminder' 到期提醒（默认）/ 'weekly' 每周支出回顾
export function reportSubscribeGrant(accept, type = 'reminder') {
  return request({
    url: '/subease/auth/subscribe-grant',
    method: 'POST',
    data: { accept, type }
  })
}
