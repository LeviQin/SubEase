import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

let source = await readFile(new URL('../utils/subease/cache.js', import.meta.url), 'utf8')
source = source.replace("import { MAX_CUSTOM_CATEGORIES } from './constants'", 'const MAX_CUSTOM_CATEGORIES = 6')

const storage = new Map()
globalThis.uni = {
  getStorageSync: (key) => storage.get(key),
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: (key) => storage.delete(key)
}

const cache = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('keeps subscription cache isolated to the signed-in user', () => {
  storage.set('subease-auth', { userInfo: { id: 10 } })
  cache.saveSubscriptionsCache([{ id: 1, name: '用户 A' }])
  assert.equal(cache.loadSubscriptionsCache()[0].name, '用户 A')

  storage.set('subease-auth', { userInfo: { id: 11 } })
  assert.equal(cache.loadSubscriptionsCache(), null)
})

test('does not expose legacy unscoped subscription cache', () => {
  storage.set('subease-auth', { userInfo: { id: 10 } })
  storage.set('subease-subscriptions-cache', { list: [{ id: 2, name: '旧缓存' }] })
  assert.equal(cache.loadSubscriptionsCache(), null)
})

test('keeps payment history cache isolated to the signed-in user', () => {
  storage.set('subease-auth', { userInfo: { id: 10 } })
  cache.savePaymentRecordsCache([{ id: 1, subscriptionId: 3 }])
  assert.equal(cache.loadPaymentRecordsCache()[0].subscriptionId, 3)

  storage.set('subease-auth', { userInfo: { id: 11 } })
  assert.equal(cache.loadPaymentRecordsCache(), null)
})
