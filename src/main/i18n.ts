// Ana süreçteki metinler (tepsi menüsü, bildirimler, kurulum hataları) seçili dille çevrilir.
import { app } from 'electron'
import { resolveLocale, translate, type MessageKey, type Params } from '@shared/i18n'

let locale = 'en'

const systemTags = (): string[] => {
  const tags = [...app.getPreferredSystemLanguages(), app.getLocale()]
  // Paketlenmiş uygulamada LANGUAGE/LANG değişkenleri dil tercihini Chromium'dan önce yansıtır.
  for (const env of ['LANGUAGE', 'LC_ALL', 'LC_MESSAGES', 'LANG']) {
    const v = process.env[env]
    if (v) tags.unshift(...v.split(':'))
  }
  return tags.filter(Boolean)
}

export const systemLocale = (): string => resolveLocale('system', systemTags())

export function setLanguage(preference: string): void {
  locale = resolveLocale(preference, systemTags())
}

export const currentLocale = (): string => locale

export const mt = (key: MessageKey, params?: Params): string => translate(locale, key, params)
