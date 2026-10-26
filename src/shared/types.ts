import type { Range } from './search'

export type ItemKind = 'text' | 'image'

/** Geçmişteki bir kayıt (diskteki dizin). Resmin kendisi `images/<id>.png`, küçüğü `images/<id>.thumb.png`. */
export interface HistoryItem {
  id: string
  kind: ItemKind
  /** Son kopyalanma ya da yapıştırılma zamanı (ms). */
  createdAt: number
  pinned: boolean
  /** İçerik özeti (sha1); aynı içerik ikinci kez kopyalanınca yeni kayıt açılmaz, öne alınır. */
  hash: string
  text?: string
  html?: string
  image?: { width: number; height: number; bytes: number }
}

/** Geçmiş penceresine giden kayıt: uzun metin kısaltılır, aranan sözcüklerin yerleri eklenir. */
export interface PopupItem {
  id: string
  kind: ItemKind
  createdAt: number
  pinned: boolean
  preview?: string
  /** Metnin tam uzunluğu (karakter). */
  length?: number
  hasHtml?: boolean
  ranges?: Range[]
  image?: { width: number; height: number; bytes: number; thumb: string }
}

export type PopupFilter = 'all' | 'text' | 'image' | 'pinned'

export type ThemeSetting = 'system' | 'light' | 'dark'

/**
 * Geçmişin açılış biçimi: `auto` metin alanı odaktaysa onun altında küçük pencere, değilse ekranın altında panel;
 * `sheet` her zaman alttaki panel.
 */
export type LayoutSetting = 'auto' | 'sheet'

/** Açık geçmişin biçimi. */
export type PopupMode = 'popup' | 'sheet'

export interface Settings {
  /** 'system' ya da dil kodu (ör. 'tr', 'pt-BR'). */
  language: string
  /** Geçmiş kaç gün saklanır; 0 = süresiz. */
  retentionDays: number
  theme: ThemeSetting
  launchAtLogin: boolean
  autoUpdateCheck: boolean
  layout: LayoutSetting
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'system',
  retentionDays: 30,
  theme: 'system',
  launchAtLogin: true,
  autoUpdateCheck: true,
  layout: 'auto'
}

export interface HistoryStats {
  total: number
  text: number
  images: number
  pinned: number
  /** Resim dosyalarının ve dizinin diskteki toplam boyutu (bayt). */
  bytes: number
}

export type ExtensionStatus =
  'active' | 'needs-relogin' | 'outdated' | 'disabled' | 'error' | 'not-installed'

export interface ShortcutConflict {
  /** Kısayolu tutan bağlamanın okunur adı (ör. "Diodon", "Bildirim Listesi"). */
  name: string
}

export interface IntegrationState {
  /** Masaüstü GNOME Shell mi. */
  gnome: boolean
  session: 'wayland' | 'x11' | 'unknown'
  extension: ExtensionStatus
  extensionError?: string
  /** Super+V'yi tutan başka bağlamalar. */
  conflicts: ShortcutConflict[]
  /** UPaste'in kısayolu (GTK hızlandırıcı biçiminde, ör. `<Super>v`); boşsa kısayol bırakılmış. */
  shortcut: string
  /** UPaste daha önce başka bağlamalardan kısayolu aldı (geri yüklenebilir). */
  tookOver: boolean
  /** Eklenti kısayolu tutuyor ve geçmiş açılabiliyor. */
  ready: boolean
}
