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

export function batchImportSubscriptions(items) {
  return request({
    url: '/subease/subscription/batch-import',
    method: 'POST',
    data: { items }
  })
}

export function updateDefaultRemindDays(remindDays) {
  return request({
    url: '/subease/subscription/remind-days',
    method: 'PUT',
    data: { remindDays }
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

export function requestExport(format = 'csv') {
  return request({
    url: format === 'xlsx' ? '/subease/subscription/export-xlsx' : '/subease/subscription/export',
    method: 'GET'
  })
}
