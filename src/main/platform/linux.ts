// Linux (GNOME) bütünleşmesi: GNOME Shell eklentisi ve masaüstü ayarları (gnome.ts), eklentiyle D-Bus köprüsü
// (shell.ts). Eklentinin hazır olması izlenir; sürümü değişince geçmiş penceresi ve kısayol yeniden kurulur.
import { EventEmitter } from 'events'
import type { IntegrationState } from '@shared/types'
import {
  changeShortcut,
  installExtension,
  integrationState,
  logout,
  pauseShortcut,
  refreshInstalledExtension,
  restoreShortcut,
  syncShortcut,
  takeOverShortcut
} from '../gnome'
import { shell } from '../shell'
import { debug } from '../log'
import type { AppHooks, Integration } from './bridge'

/** Yükleyicili eklentinin yeni çekirdeği klasörde görüp açması için beklenen süre. */
const EXTENSION_RELOAD_MS = 1500

export class LinuxIntegration extends EventEmitter implements Integration {
  private hooks: AppHooks | null = null

  async start(hooks: AppHooks): Promise<void> {
    this.hooks = hooks
    try {
      const ok = await shell.start({
        show: () => hooks.showHistory(),
        openSettings: () => hooks.openSettings()
      })
      if (!ok) console.error('io.github.metin_aydin.UPaste adı başka bir süreçte')
    } catch (err) {
      console.error('Oturum veri yoluna bağlanılamadı:', err)
      return
    }
    shell.on('shell-restarted', () => void this.watchExtension())
    if (refreshInstalledExtension())
      setTimeout(() => void this.watchExtension(), EXTENSION_RELOAD_MS)
    await this.watchExtension()
  }

  stop(): void {
    // Kısayolu eklenti tutar; uygulama kapanınca eklenti ad sahibinin gittiğini görüp tuşları bırakır.
  }

  /**
   * Eklentinin hazır olduğunu izler: oturum açılışında uygulama kabuktan önce başlayabilir, kabuk yoğunken ilk soru
   * zaman aşımına uğrayabilir. Eklenti yanıt verene kadar önce 2 sn, bir dakika sonra 30 sn arayla yeniden sorulur;
   * yanıt gelince kısayol bildirilir ve ayarlar penceresi güncellenir.
   */
  private async watchExtension(): Promise<void> {
    const started = Date.now()
    const check = async (): Promise<void> => {
      const before = shell.apiVersion
      await shell.version()
      debug('extension', shell.apiVersion)
      if (shell.active) {
        if (shell.apiVersion !== before) {
          this.hooks?.bridgeChanged()
          await syncShortcut()
          this.emit('changed')
        }
        return
      }
      setTimeout(() => void check(), Date.now() - started < 60_000 ? 2000 : 30_000)
    }
    await check()
  }

  state(): Promise<IntegrationState> {
    return integrationState()
  }

  install(): Promise<void> {
    return installExtension()
  }

  takeOver(): Promise<void> {
    return takeOverShortcut()
  }

  restore(): Promise<void> {
    return restoreShortcut()
  }

  logout(): void {
    logout()
  }

  async requestAccess(): Promise<void> {
    // GNOME'da ek izin gerekmez.
  }

  setShortcut(accel: string): Promise<void> {
    return changeShortcut(accel)
  }

  pauseShortcut(paused: boolean): Promise<void> {
    return pauseShortcut(paused)
  }
}
