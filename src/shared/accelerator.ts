// Kısayollar GNOME'un (GTK) hızlandırıcı biçiminde saklanır: `<Super>v`, `<Control><Shift>v`. Ayarlar penceresindeki
// kaydedici klavye olayından bu biçimi üretir; arayüz "Super + V" gibi okunur parçalar gösterir.

export interface KeyLike {
  key: string
  code: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

const MODIFIER_ORDER = ['Super', 'Control', 'Alt', 'Shift'] as const

const NAMED_KEYS: Record<string, string> = {
  Space: 'space',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'Page_Up',
  PageDown: 'Page_Down'
}

/** Olaydaki tuşun hızlandırıcı adı (düzenden bağımsız: fiziksel harf/rakam tuşu ya da adlı tuş); yoksa null. */
function keyName(e: KeyLike): string | null {
  const letter = /^Key([A-Z])$/.exec(e.code)
  if (letter) return letter[1].toLowerCase()
  const digit = /^Digit([0-9])$/.exec(e.code)
  if (digit) return digit[1]
  if (/^F([1-9]|1[0-2])$/.test(e.code)) return e.code
  return NAMED_KEYS[e.code] ?? null
}

/**
 * Klavye olayından hızlandırıcı. En az bir Super, Ctrl ya da Alt ile bir harf, rakam, F tuşu ya da adlı tuş
 * gerekir (yalnız Shift'li kısayollar yazıyla karışır). Geçersizse null.
 */
export function acceleratorFromEvent(e: KeyLike): string | null {
  if (!e.ctrlKey && !e.altKey && !e.metaKey) return null
  const key = keyName(e)
  if (!key) return null
  const mods: string[] = []
  if (e.metaKey) mods.push('<Super>')
  if (e.ctrlKey) mods.push('<Control>')
  if (e.altKey) mods.push('<Alt>')
  if (e.shiftKey) mods.push('<Shift>')
  return mods.join('') + key
}

const LABELS: Record<string, string> = {
  super: 'Super',
  mod4: 'Super',
  control: 'Ctrl',
  primary: 'Ctrl',
  ctrl: 'Ctrl',
  alt: 'Alt',
  mod1: 'Alt',
  shift: 'Shift'
}

/** `<Super>v` → ['Super', 'V']. */
export function acceleratorParts(accel: string): string[] {
  const mods = [...accel.matchAll(/<([^>]+)>/g)].map((m) => LABELS[m[1].toLowerCase()] ?? m[1])
  const key = accel.replace(/<[^>]+>/g, '')
  const ordered = [...new Set(mods)].sort(
    (a, b) =>
      MODIFIER_ORDER.indexOf(a.replace('Ctrl', 'Control') as (typeof MODIFIER_ORDER)[number]) -
      MODIFIER_ORDER.indexOf(b.replace('Ctrl', 'Control') as (typeof MODIFIER_ORDER)[number])
  )
  const keyLabel = key.length === 1 ? key.toUpperCase() : key.replace(/_/g, ' ')
  return [...ordered, keyLabel]
}

export const acceleratorLabel = (accel: string): string => acceleratorParts(accel).join('+')
