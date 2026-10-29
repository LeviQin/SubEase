import { request, uploadFile } from '../../utils/subease/request'

function shouldUploadAvatar(avatarFilePath = '') {
  if (!avatarFilePath) {
    return false
  }

  if (/^(wxfile:\/\/|file:\/\/|blob:|content:)/.test(avatarFilePath)) {
    return true
  }

  if (/^https?:\/\/tmp\//i.test(avatarFilePath)) {
    return true
  }

  return false
}

export function wxLogin(code) {
  return request({
    url: '/subease/auth/wx-login',
    method: 'POST',
    data: { code },
    custom: {
      skipAuth: true,
      skipRefresh: true
    }
  })
}

export function refreshAccessToken(refreshToken) {
  return request({
    url: '/subease/auth/refresh-token',
    method: 'POST',
    data: { refreshToken },
    custom: {
      skipAuth: true,
      skipRefresh: true
    }
  })
}

export function getCurrentUser() {
  return request({
    url: '/subease/auth/me',
    method: 'GET'
  })
}

export function updateMonthlyBudget(monthlyBudgetCny) {
  return request({
    url: '/subease/auth/monthly-budget',
    method: 'PUT',
    data: { monthlyBudgetCny }
  })
}

export function updateProfile({ nickname, avatarFilePath }) {
  const hasNewAvatar = shouldUploadAvatar(avatarFilePath)
  const formData = {}
  if (nickname) {
    formData.nickname = nickname
  }

  if (!hasNewAvatar) {
    return request({
      url: '/subease/auth/update-profile',
      method: 'POST',
      data: formData
    })
  }

  return uploadFile({
    url: '/subease/auth/update-profile',
    name: 'avatar',
    filePath: avatarFilePath,
    formData
  })
}
