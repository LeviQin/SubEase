import { request } from '../../utils/subease/request'

export function submitFeedback({ type, content, contact }) {
  return request({
    url: '/subease/feedback',
    method: 'POST',
    data: { type, content, contact }
  })
}

export function getFeedbackList() {
  return request({
    url: '/subease/feedback/list',
    method: 'GET'
  })
}

export function markFeedbackRead(id) {
  return request({
    url: `/subease/feedback/${id}/read`,
    method: 'POST'
  })
}
