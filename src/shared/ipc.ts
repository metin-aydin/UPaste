import type { DesktopPlatform } from './accelerator'
import type { PopupMode } from './types'

// Ana süreç ile pencereler arasındaki kanallar. Ön yükleme betiği yalnız bu listedeki kanallara izin verir.
export const IPC = {
  uiInfo: 'ui:info',
  uiChanged: 'ui:changed',
  openSettings: 'app:open-settings',
  openExternal: 'app:open-external',

  popupList: 'popup:list',
  popupPaste: 'popup:paste',
  popupPin: 'popup:pin',
  popupDelete: 'popup:delete',
  popupClose: 'popup:close',
  popupShown: 'popup:shown',
  popupKey: 'popup:key',
  popupFocus: 'popup:focus',
  popupRequestFocus: 'popup:request-focus',
  popupQuery: 'popup:query',
  popupTyping: 'popup:typing',
  historyChanged: 'history:changed',

  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  settingsNavigate: 'settings:navigate',
  historyStats: 'history:stats',
  historyClear: 'history:clear',

  integrationGet: 'integration:get',
  integrationInstall: 'integration:install',
  integrationTakeOver: 'integration:take-over',
  integrationRestore: 'integration:restore',
  integrationLogout: 'integration:logout',
  integrationRequestAccess: 'integration:request-access',
  integrationSetShortcut: 'integration:set-shortcut',
  integrationPauseShortcut: 'integration:pause-shortcut',
  integrationChanged: 'integration:changed',

  updateGet: 'update:get',
  updateCheck: 'update:check',
  updateDownload: 'update:download',
  updateInstall: 'update:install',
  updateAutoCheck: 'update:auto-check',
  updateState: 'update:state'
} as const

export type Channel = (typeof IPC)[keyof typeof IPC]

export const CHANNELS: readonly string[] = Object.values(IPC)

/** Pencerelerin dil, tema ve sürüm bilgisi. */
export interface UiInfo {
  locale: string
  /** Sistem dilinden çıkarılan dil ('system' seçiliyken kullanılan). */
  systemLocale: string
  dark: boolean
  version: string
  /** İşletim sistemi: kısayol etiketleri ve Kurulum bölümü buna göre gösterilir. */
  platform: DesktopPlatform
}

export type SettingsSection = 'general' | 'history' | 'setup' | 'updates' | 'about'

export interface PopupShown {
  mode: PopupMode
  /** Küçük pencere metin alanının üstünde açıldı (açılış animasyonunun yönü). */
  above: boolean
  /** Pencere klavye odağında (arama kutusu doğrudan yazılabilir); değilse tuşlar eklentiden gelir. */
  focused: boolean
  /** Pencere hiç odak almaz; arama metni eklentinin giriş kutusundan gelir. */
  overlay: boolean
}
