// Kısayollar her işletim sisteminde GNOME'un (GTK) hızlandırıcı biçiminde saklanır: `<Super>v`, `<Control><Shift>v`.
// `<Super>` Linux'ta Super, Windows'ta Windows, macOS'ta Command tuşudur. Ayarlar penceresindeki kaydedici klavye
// olayından bu biçimi üretir; arayüz işletim sistemine göre okunur parçalar gösterir ("Win + V", "⌘ ⇧ V").

export type DesktopPlatform = 'linux' | 'win32' | 'darwin'

/** Varsayılan kısayol: Linux ve Windows'ta Super/Win+V, macOS'ta ⌘⇧V (⌘V yapıştırmadır). */
export const defaultShortcut = (platform: DesktopPlatform): string =>
  platform === 'darwin' ? '<Super><Shift>v' : '<Super>v'

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

const MODIFIER_NAMES: Record<string, (typeof MODIFIER_ORDER)[number]> = {
  super: 'Super',
  mod4: 'Super',
  meta: 'Super',
  control: 'Control',
  primary: 'Control',
  ctrl: 'Control',
  alt: 'Alt',
  mod1: 'Alt',
  shift: 'Shift'
}

/** Hızlandırıcının değiştiricileri (sıralı, tekrarsız) ve tuşu. */
export function parseAccelerator(accel: string): {
  modifiers: (typeof MODIFIER_ORDER)[number][]
  key: string
} {
  const names = [...accel.matchAll(/<([^>]+)>/g)]
    .map((m) => MODIFIER_NAMES[m[1].toLowerCase()])
    .filter((m): m is (typeof MODIFIER_ORDER)[number] => !!m)
  const modifiers = MODIFIER_ORDER.filter((m) => names.includes(m))
  return { modifiers, key: accel.replace(/<[^>]+>/g, '') }
}

const LABELS: Record<DesktopPlatform, Record<(typeof MODIFIER_ORDER)[number], string>> = {
  linux: { Super: 'Super', Control: 'Ctrl', Alt: 'Alt', Shift: 'Shift' },
  win32: { Super: 'Win', Control: 'Ctrl', Alt: 'Alt', Shift: 'Shift' },
  darwin: { Super: '⌘', Control: '⌃', Alt: '⌥', Shift: '⇧' }
}

/** macOS değiştiricileri Apple'ın sırasıyla gösterilir: ⌃ ⌥ ⇧ ⌘. */
const DARWIN_ORDER = ['Control', 'Alt', 'Shift', 'Super'] as const

/** `<Super>v` → ['Super', 'V'] (Windows'ta ['Win', 'V'], macOS'ta ['⌘', 'V']). */
export function acceleratorParts(accel: string, platform: DesktopPlatform = 'linux'): string[] {
  const { modifiers, key } = parseAccelerator(accel)
  const ordered =
    platform === 'darwin' ? DARWIN_ORDER.filter((m) => modifiers.includes(m)) : modifiers
  const keyLabel = key.length === 1 ? key.toUpperCase() : key.replace(/_/g, ' ')
  return [...ordered.map((m) => LABELS[platform][m]), keyLabel]
}

export const acceleratorLabel = (accel: string, platform: DesktopPlatform = 'linux'): string =>
  acceleratorParts(accel, platform).join(platform === 'darwin' ? '' : '+')

const ELECTRON_KEYS: Record<string, string> = {
  space: 'Space',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  Page_Up: 'PageUp',
  Page_Down: 'PageDown'
}

/**
 * Electron `globalShortcut` biçimi: `<Super><Shift>v` → `Super+Shift+V` (Super, macOS'ta Command'dır). Tanınmayan
 * tuşta null.
 */
export function electronAccelerator(accel: string): string | null {
  const { modifiers, key } = parseAccelerator(accel)
  let name: string | null = null
  if (/^[a-z0-9]$/i.test(key)) name = key.toUpperCase()
  else if (/^F([1-9]|1[0-2])$/.test(key)) name = key
  else name = ELECTRON_KEYS[key] ?? null
  if (!name || !modifiers.length) return null
  return [...modifiers, name].join('+')
}

const VIRTUAL_KEYS: Record<string, number> = {
  space: 0x20,
  Page_Up: 0x21,
  Page_Down: 0x22,
  End: 0x23,
  Home: 0x24,
  Insert: 0x2d
}

/** Windows sanal tuş kodu (VK_*): harf ve rakamlar ASCII büyük harf koduyla, F1–F12 0x70'ten başlar. */
export function windowsVirtualKey(key: string): number | null {
  if (/^[a-z0-9]$/i.test(key)) return key.toUpperCase().charCodeAt(0)
  const f = /^F([1-9]|1[0-2])$/.exec(key)
  if (f) return 0x6f + Number(f[1])
  return VIRTUAL_KEYS[key] ?? null
}
