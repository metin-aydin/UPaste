import { DAY_MS, expiredIds, overflowIds } from '../../src/shared/retention'
import { eq, run, test } from './harness'

const now = 100 * DAY_MS
const items = [
  { id: 'new', createdAt: now - DAY_MS, pinned: false },
  { id: 'old', createdAt: now - 40 * DAY_MS, pinned: false },
  { id: 'old-pinned', createdAt: now - 400 * DAY_MS, pinned: true }
]

test('süresi dolanlar silinir, sabitlenenler kalır', () => {
  eq(expiredIds(items, 30, now), ['old'])
})

test('0 gün = süresiz', () => {
  eq(expiredIds(items, 0, now), [])
})

test('üst sınırı aşan en eski sabitlenmemiş öğeler', () => {
  eq(overflowIds(items, 1), ['old'])
})

void run('retention')
