import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../utils/subease/helpers.js', import.meta.url), 'utf8')
const helpers = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

function dateString(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

test('keeps the original month-end anchor when rolling across February', () => {
  assert.equal(helpers.rollNextDate('2026-01-31', '月付', new Date(2026, 2, 1)), '2026-03-31')
})

test('counts a prepaid subscription on its actual next payment date', () => {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15)
  const lastPaid = new Date(now.getFullYear(), now.getMonth() - 1, 15)
  const list = helpers.normalizeSubscriptions([
    {
      id: 1,
      name: '预付会员',
      price: 30,
      currency: 'CNY',
      cycle: '月付',
      nextDate: dateString(nextMonth),
      lastPaidDate: dateString(lastPaid),
      paidCycles: 2,
      autoRenew: true
    }
  ])
  assert.equal(helpers.getSummaryStats(list, { CNY: 1 }).nextMonthTotal, 30)
})

test('keeps a recorded payment in the annual report after manual expiry', () => {
  const year = new Date().getFullYear() - 1
  const paidDate = `${year}-06-15`
  const list = helpers.normalizeSubscriptions([
    {
      id: 2,
      name: '已停止会员',
      price: 120,
      currency: 'CNY',
      cycle: '年付',
      nextDate: paidDate,
      lastPaidDate: paidDate,
      paidCycles: 1,
      autoRenew: false
    }
  ])
  assert.equal(helpers.getYearlyBreakdown(list, { CNY: 1 }, year).total, 120)
})

test('rejects invalid dates and duplicate names in CSV preview', () => {
  const csv = [
    '名称,金额,货币,分类,周期,下次付款日,支付方式,自动续费,备注',
    'Netflix,68,CNY,视频,月付,2026-02-31,微信,是,',
    'Spotify,15,USD,音乐,月付,2026-10-01,信用卡,是,',
    'spotify,15,USD,音乐,月付,2026-11-01,信用卡,是,'
  ].join('\n')
  const result = helpers.parseSubscriptionsCsv(csv)
  assert.equal(result.valid.length, 1)
  assert.equal(result.errors.length, 2)
})

test('preserves prepaid and reminder fields from the extended CSV export', () => {
  const csv = [
    '名称,金额,货币,分类,周期,下次付款日,上次扣款日,预付周期数,提醒天数,支付方式,自动续费,备注',
    '年度服务,199,CNY,工具,年付,2027-09-01,2026-09-01,1,0,信用卡,是,测试'
  ].join('\n')
  const result = helpers.parseSubscriptionsCsv(csv)
  assert.equal(result.errors.length, 0)
  assert.deepEqual(
    {
      lastPaidDate: result.valid[0].lastPaidDate,
      paidCycles: result.valid[0].paidCycles,
      remindDays: result.valid[0].remindDays
    },
    { lastPaidDate: '2026-09-01', paidCycles: 1, remindDays: 0 }
  )
})

test('does not convert a foreign currency at a fabricated 1:1 rate', () => {
  const list = helpers.normalizeSubscriptions([
    { id: 3, name: 'USD', price: 20, currency: 'USD', cycle: '月付', nextDate: dateString(new Date()), autoRenew: true }
  ])
  assert.equal(helpers.getSummaryStats(list, {}).monthlyTotal, 0)
  assert.equal(helpers.hasMissingRates(list, {}), true)
})

test('adapts long amount text without truncating it', () => {
  assert.equal(helpers.getAdaptiveAmountFontSize('¥289.94', 44, 24, 7), '44rpx')
  assert.equal(helpers.getAdaptiveAmountFontSize('¥1,234,567.89', 44, 24, 7), '24rpx')
  assert.equal(helpers.getAdaptiveAmountFontSize('¥1,234,567.89', 18, 8, 5), '8rpx')
})
