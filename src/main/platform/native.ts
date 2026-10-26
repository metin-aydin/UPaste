// Windows ve macOS köprülerinin ortak kısmı. Bu sistemlerde geçmiş penceresi odağı alır ve tuşları kendisi işler;
// GNOME'daki odak almayan katmanın işlemleri (tuş yakalama, görünmez arama kutusu, dışarı tıklama izleme) ile
// Linux'a özgü kurulum işlemlerinin (eklenti, kısayol devralma, oturum kapatma) karşılığı yoktur.
import { EventEmitter } from 'events'
import type { IntegrationState } from '@shared/types'
import type { FocusInfo, PasteKeys } from '../shell'
import type { AppHooks, DesktopBridge, Integration } from './bridge'

export abstract class NativeDesktop extends EventEmitter implements DesktopBridge, Integration {
  readonly canCapture = false
  readonly canType = false
  readonly canWatchClicks = false

  abstract get active(): boolean
  abstract start(hooks: AppHooks): Promise<void>
  abstract stop(): void
  abstract windowInfo(id: number): Promise<FocusInfo | null>
  abstract paste(windowId: number, keys: PasteKeys): Promise<boolean>
  abstract state(): Promise<IntegrationState>
  abstract setShortcut(accel: string): Promise<void>
  abstract pauseShortcut(paused: boolean): Promise<void>

  async captureKeys(): Promise<void> {
    // Tuşları odaktaki geçmiş penceresi alır.
  }

  async replayKey(): Promise<void> {
    // Tuşları odaktaki geçmiş penceresi alır.
  }

  async startTyping(): Promise<void> {
    // Arama metni geçmiş penceresinin kendi arama kutusuna yazılır.
  }

  async stopTyping(): Promise<void> {
    // Arama metni geçmiş penceresinin kendi arama kutusuna yazılır.
  }

  async watchClicks(): Promise<void> {
    // Pencere dışına tıklanınca pencere odağı kaybeder ve kapanır.
  }

  async focusOwnWindow(): Promise<boolean> {
    return true
  }

  async install(): Promise<void> {
    // Kurulacak eklenti yok.
  }

  async takeOver(): Promise<void> {
    // Kısayolu tutan masaüstü bağlaması yok.
  }

  async restore(): Promise<void> {
    // Kısayolu tutan masaüstü bağlaması yok.
  }

  logout(): void {
    // Oturum yenilemesi gerekmez.
  }

  async requestAccess(): Promise<void> {
    // Ek izin gerekmez.
  }
}
