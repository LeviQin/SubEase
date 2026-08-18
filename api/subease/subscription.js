import { request } from '../../utils/subease/request'

export function getSubscriptionList() {
  return request({
    url: '/subease/subscription/list',
    method: 'GET'
  })
}

export function createSubscription(data) {
  return request({
    url: '/subease/subscription',
    method: 'POST',
    data
  })
}

export function updateSubscription(id, data) {
  return request({
    url: `/subease/subscription/${id}`,
    method: 'PUT',
    data
  })
}

export function deleteSubscription(id) {
  return request({
    url: `/subease/subscription/${id}`,
    method: 'DELETE'
  })
}

export function batchDeleteSubscriptions(ids) {
  return request({
    url: '/subease/subscription/batch-delete',
    method: 'POST',
    data: { ids }
  })
}

// 批量更新订阅分类：自定义分类删除（→ 其他）/ 改名（→ 新名）时联动
export function batchUpdateCategory(from, to) {
  return request({
    url: '/subease/subscription/batch-category',
    method: 'PUT',
    data: { from, to }
  })
}

export function requestExport() {
  return request({
    url: '/subease/subscription/export-xlsx',
    method: 'GET'
  })
}
