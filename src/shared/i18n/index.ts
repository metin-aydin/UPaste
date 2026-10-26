import { en, type MessageKey, type Messages } from './en'
import { ar } from './ar'
import { bn } from './bn'
import { cs } from './cs'
import { da } from './da'
import { de } from './de'
import { el } from './el'
import { es } from './es'
import { fa } from './fa'
import { fi } from './fi'
import { fr } from './fr'
import { he } from './he'
import { hi } from './hi'
import { hu } from './hu'
import { id } from './id'
import { it } from './it'
import { ja } from './ja'
import { ko } from './ko'
import { ms } from './ms'
import { nb } from './nb'
import { nl } from './nl'
import { pl } from './pl'
import { ptBR } from './pt-BR'
import { ro } from './ro'
import { ru } from './ru'
import { sv } from './sv'
import { th } from './th'
import { tr } from './tr'
import { uk } from './uk'
import { ur } from './ur'
import { vi } from './vi'
import { zhCN } from './zh-CN'
import { zhTW } from './zh-TW'

export type { MessageKey, Messages }

export interface LocaleInfo {
  code: string
  /** Dilin kendi dilindeki adı. */
  name: string
  dir: 'ltr' | 'rtl'
}

/** Desteklenen diller; ayarlardaki listede bu sırayla görünür. */
export const LOCALES: LocaleInfo[] = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', dir: 'ltr' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
  { code: 'pt-BR', name: 'Português (Brasil)', dir: 'ltr' },
  { code: 'it', name: 'Italiano', dir: 'ltr' },
  { code: 'nl', name: 'Nederlands', dir: 'ltr' },
  { code: 'pl', name: 'Polski', dir: 'ltr' },
  { code: 'cs', name: 'Čeština', dir: 'ltr' },
  { code: 'ro', name: 'Română', dir: 'ltr' },
  { code: 'hu', name: 'Magyar', dir: 'ltr' },
  { code: 'el', name: 'Ελληνικά', dir: 'ltr' },
  { code: 'sv', name: 'Svenska', dir: 'ltr' },
  { code: 'da', name: 'Dansk', dir: 'ltr' },
  { code: 'nb', name: 'Norsk bokmål', dir: 'ltr' },
  { code: 'fi', name: 'Suomi', dir: 'ltr' },
  { code: 'ru', name: 'Русский', dir: 'ltr' },
  { code: 'uk', name: 'Українська', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'fa', name: 'فارسی', dir: 'rtl' },
  { code: 'he', name: 'עברית', dir: 'rtl' },
  { code: 'ur', name: 'اردو', dir: 'rtl' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr' },
  { code: 'bn', name: 'বাংলা', dir: 'ltr' },
  { code: 'id', name: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'ms', name: 'Bahasa Melayu', dir: 'ltr' },
  { code: 'vi', name: 'Tiếng Việt', dir: 'ltr' },
  { code: 'th', name: 'ไทย', dir: 'ltr' },
  { code: 'ja', name: '日本語', dir: 'ltr' },
  { code: 'ko', name: '한국어', dir: 'ltr' },
  { code: 'zh-CN', name: '简体中文', dir: 'ltr' },
  { code: 'zh-TW', name: '繁體中文', dir: 'ltr' }
]

export const DICTIONARIES: Record<string, Messages> = {
  en,
  tr,
  de,
  fr,
  es,
  'pt-BR': ptBR,
  it,
  nl,
  pl,
  cs,
  ro,
  hu,
  el,
  sv,
  da,
  nb,
  fi,
  ru,
  uk,
  ar,
  fa,
  he,
  ur,
  hi,
  bn,
  id,
  ms,
  vi,
  th,
  ja,
  ko,
  'zh-CN': zhCN,
  'zh-TW': zhTW
}

/** Sistem dil etiketini (ör. "tr-TR", "pt_PT", "zh-Hant-HK") desteklenen dillerden birine eşler. */
export function matchLocale(tag: string): string | null {
  const norm = tag.replace(/_/g, '-').replace(/\..*$/, '').toLowerCase()
  if (!norm || norm === 'c' || norm === 'posix') return null
  const exact = LOCALES.find((l) => l.code.toLowerCase() === norm)
  if (exact) return exact.code
  const [lang, ...rest] = norm.split('-')
  if (lang === 'zh') {
    const traditional = rest.some((p) => ['hant', 'tw', 'hk', 'mo'].includes(p))
    return traditional ? 'zh-TW' : 'zh-CN'
  }
  if (lang === 'pt') return 'pt-BR'
  if (lang === 'no' || lang === 'nn') return 'nb'
  const byLang = LOCALES.find((l) => l.code.split('-')[0] === lang)
  return byLang?.code ?? null
}

/** Ayardaki dil ('system' ya da kod) ve sistem dilleri → kullanılacak dil. */
export function resolveLocale(preference: string, system: readonly string[]): string {
  if (preference !== 'system' && DICTIONARIES[preference]) return preference
  for (const tag of system) {
    const match = matchLocale(tag)
    if (match) return match
  }
  return 'en'
}

export type Params = Record<string, string | number>

export function translate(locale: string, key: MessageKey, params?: Params): string {
  const text = DICTIONARIES[locale]?.[key] ?? en[key]
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    params[name] !== undefined ? String(params[name]) : whole
  )
}

export const localeDir = (locale: string): 'ltr' | 'rtl' =>
  LOCALES.find((l) => l.code === locale)?.dir ?? 'ltr'

export const localeName = (locale: string): string =>
  LOCALES.find((l) => l.code === locale)?.name ?? locale
