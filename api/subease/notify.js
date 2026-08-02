import { request } from '../../utils/subease/request'

// 上报微信订阅消息授权结果（accept 为 true 时后端 +1 次可推送额度）
export function reportSubscribeGrant(accept) {
  return request({
    url: '/subease/auth/subscribe-grant',
    method: 'POST',
    data: { accept }
  })
}
