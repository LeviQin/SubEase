import { request } from '../../utils/subease/request'

export function getSubscriptionList() {
  return request({
    url: '/subscription/list',
    method: 'GET'
  })
}

export function createSubscription(data) {
  return request({
    url: '/subscription',
    method: 'POST',
    data
  })
}

export function updateSubscription(id, data) {
  return request({
    url: `/subscription/${id}`,
    method: 'PUT',
    data
  })
}

export function deleteSubscription(id) {
  return request({
    url: `/subscription/${id}`,
    method: 'DELETE'
  })
}

export function batchDeleteSubscriptions(ids) {
  return request({
    url: '/subscription/batch-delete',
    method: 'POST',
    data: { ids }
  })
}

export function requestExport() {
  return request({
    url: '/subscription/export-xlsx',
    method: 'GET'
  })
}
