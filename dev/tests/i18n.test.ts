import { en } from '../../src/shared/i18n/en'
import { DICTIONARIES, LOCALES, matchLocale, resolveLocale, translate } from '../../src/shared/i18n'
import { eq, ok, run, test } from './harness'

const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
const keys = Object.keys(en)

test('her dil için sözlük var', () => {
  for (const l of LOCALES) ok(DICTIONARIES[l.code], `sözlük yok: ${l.code}`)
})

test('her dilde aynı anahtarlar, aynı sırada', () => {
  for (const [code, dict] of Object.entries(DICTIONARIES)) eq(Object.keys(dict), keys, code)
})

test('yer tutucular korunmuş', () => {
  for (const [code, dict] of Object.entries(DICTIONARIES))
    for (const k of keys)
      eq(
        placeholders(dict[k as keyof typeof en]),
        placeholders(en[k as keyof typeof en]),
        `${code} ${k}`
      )
})

test('boş çeviri yok', () => {
  for (const [code, dict] of Object.entries(DICTIONARIES))
    for (const k of keys) ok(String(dict[k as keyof typeof en]).trim(), `${code} ${k} boş`)
})

test('sistem dili eşleme', () => {
  eq(matchLocale('tr_TR.UTF-8'), 'tr')
  eq(matchLocale('pt-PT'), 'pt-BR')
  eq(matchLocale('zh-Hant-HK'), 'zh-TW')
  eq(matchLocale('zh_CN'), 'zh-CN')
  eq(matchLocale('nn'), 'nb')
  eq(resolveLocale('system', ['xx', 'de-AT']), 'de')
  eq(resolveLocale('system', ['C']), 'en')
  eq(resolveLocale('ja', ['tr']), 'ja')
})

test('yer tutucu doldurma', () => {
  eq(
    translate('en', 'setup.ready', { shortcut: 'Super+V' }),
    'All set. Press Super+V in any text field.'
  )
})

void run('i18n')
