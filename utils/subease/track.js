import { request } from './request'
import { useSubeaseAuthStore } from '../../stores/subease/auth'

// 轻量埋点：静默上报，失败不打扰用户
export function track(event, props = {}) {
  const authStore = useSubeaseAuthStore()
  if (!authStore.isLoggedIn) {
    return Promise.resolve()
  }
  return request({
    url: '/subease/auth/track',
    method: 'POST',
    data: { event, props }
  }).catch(() => {})
}
