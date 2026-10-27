// Yerele göre biçimlendirme: göreli zaman, bayt ve gün sayısı (çoğul ekleri Intl'den gelir).

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1]
]

export function relativeTime(at: number, locale: string, now = Date.now()): string {
  const seconds = Math.round((at - now) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
  if (Math.abs(seconds) < 45) return rtf.format(0, 'second')
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size || unit === 'second')
      return rtf.format(Math.round(seconds / size), unit)
  }
  return ''
}

export function formatBytes(bytes: number, locale: string): string {
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: units[i],
    unitDisplay: 'short',
    maximumFractionDigits: value < 10 && i > 0 ? 1 : 0
  }).format(value)
}

export const formatDays = (days: number, locale: string): string =>
  new Intl.NumberFormat(locale, { style: 'unit', unit: 'day', unitDisplay: 'long' }).format(days)

export const formatNumber = (n: number, locale: string): string =>
  new Intl.NumberFormat(locale).format(n)
