import { request } from '../../utils/subease/request'

export function submitFeedback({ type, content, contact }) {
  return request({
    url: '/feedback',
    method: 'POST',
    data: { type, content, contact }
  })
}

export function getFeedbackList() {
  return request({
    url: '/feedback/list',
    method: 'GET'
  })
}

export function markFeedbackRead(id) {
  return request({
    url: `/feedback/${id}/read`,
    method: 'POST'
  })
}
