import { request } from '../../utils/subease/request'

// 获取汇率表（公开接口，无需登录）
export function getCurrencyRates() {
  return request({
    url: '/subease-rates',
    method: 'GET',
    custom: {
      skipAuth: true,
      skipRefresh: true
    }
  })
}
