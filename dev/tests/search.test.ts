import { fold, matchesTokens, matchRanges, queryTokens } from '../../src/shared/search'
import { eq, ok, run, test } from './harness'

test('Türkçe İ/ı/I/i aynı sayılır', () => {
  eq(fold('İSTANBUL'), 'istanbul')
  eq(fold('Istanbul'), 'istanbul')
  eq(fold('ıspanak'), 'ispanak')
})

test('aksanlar yok sayılır', () => {
  eq(fold('Ünlü Çiçek Şöyle Ğ'), 'unlu cicek soyle g')
  eq(fold('Crème brûlée, ñandú'), 'creme brulee, nandu')
})

test('tüm sözcükler bulunmalı', () => {
  const f = fold("SELECT * FROM users WHERE city = 'İstanbul'")
  ok(matchesTokens(f, queryTokens('istanbul select')))
  ok(!matchesTokens(f, queryTokens('ankara select')))
})

test('vurgu aralıkları özgün metne göre', () => {
  const text = "city = 'İstanbul'"
  const [r] = matchRanges(text, queryTokens('ist'))
  eq(text.slice(r[0], r[1]), 'İst')
})

test('birleşik karakter ve emoji kaydırmaz', () => {
  const text = '😀 école'
  const [r] = matchRanges(text, queryTokens('ecole'))
  eq(text.slice(r[0], r[1]), 'école')
})

void run('search')
