// İşletim sistemine özgü masaüstü katmanının arayüzü. Geçmiş penceresi (popup.ts) yalnız bu arayüzü kullanır:
// Linux'ta GNOME Shell eklentisinin köprüsü (shell.ts), Windows'ta ve macOS'ta yerel API köprüleri.
//
// Olaylar: `shortcut` (FocusInfo | null), `clipboard-changed`, `key` (CapturedKey), `search` (metin),
// `clicked-outside`. Son üçünü yalnız odak almayan pencereyi destekleyen GNOME köprüsü üretir.
import type { EventEmitter } from 'events'
import type { IntegrationState } from '@shared/types'
import type { Rect } from '@shared/placement'
import type { FocusInfo, PasteKeys } from '../shell'

export interface DesktopBridge extends EventEmitter {
  /** Köprü çalışıyor: kısayol, odak bilgisi ve yapıştırma kullanılabilir. */
  readonly active: boolean
  /** Geçmiş açıkken gezinme tuşları köprüden gelir (pencere odak almaz). */
  readonly canCapture: boolean
  /** Arama metni köprünün giriş kutusunda toplanır; pencere odak almayan katman olarak açılır. */
  readonly canType: boolean
  /** Pencere dışına tıklama köprüden bildirilir. */
  readonly canWatchClicks: boolean
  captureKeys(capture: boolean): Promise<void>
  replayKey(keycode: number, modifiers: number): Promise<void>
  startTyping(keycode: number, modifiers: number, horizontal: boolean): Promise<void>
  stopTyping(restoreFocus: boolean): Promise<void>
  watchClicks(inside: Rect | null): Promise<void>
  focusOwnWindow(title: string): Promise<boolean>
  /** İzlenen pencerenin güncel bilgisi; pencere kapandıysa null. */
  windowInfo(id: number): Promise<FocusInfo | null>
  /** Hedef pencereyi öne alıp yapıştırma tuşlarını gönderir; öne alınamadıysa false. */
  paste(windowId: number, keys: PasteKeys): Promise<boolean>
}

/**
 * Ayarların Kurulum bölümü ve açılış: masaüstüyle bütünleşmenin durumu ve işlemleri. Durum değişince `changed`
 * olayı yayılır.
 */
/** Masaüstü katmanının uygulamadan istediği işler. */
export interface AppHooks {
  /** Geçmişi açar (başka bir süreç istediğinde, ör. ikinci kısayol kaydı). */
  showHistory(): void
  openSettings(): void
  /** Köprünün yetenekleri değişti (ör. eklenti güncellendi): geçmiş penceresi uygun türde yeniden hazırlanır. */
  bridgeChanged(): void
}

export interface Integration extends EventEmitter {
  /** Uygulama açılırken masaüstüne bağlanır ve kısayolu kurar; olaylar köprüden (DesktopBridge) gelir. */
  start(hooks: AppHooks): Promise<void>
  /** Uygulama kapanırken kısayol ve dinleyiciler bırakılır. */
  stop(): void
  state(): Promise<IntegrationState>
  /** Linux: GNOME Shell eklentisini kurar. */
  install(): Promise<void>
  /** Linux: kısayolu tutan diğer bağlamalardan alır. */
  takeOver(): Promise<void>
  /** Linux: kısayolu önceki sahiplerine geri verir. */
  restore(): Promise<void>
  /** Linux: oturumu kapatma onayını açar. */
  logout(): void
  /** macOS: Erişilebilirlik izni ister ve ayar sayfasını açar. */
  requestAccess(): Promise<void>
  setShortcut(accel: string): Promise<void>
  /** Kısayol kaydedilirken mevcut kısayol geçici olarak bırakılır. */
  pauseShortcut(paused: boolean): Promise<void>
}
