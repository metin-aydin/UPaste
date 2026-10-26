// macOS masaüstü katmanı. Kısayol Electron'un globalShortcut'ıyla kaydedilir (varsayılan ⌘⇧V; ⌘V yapıştırmadır).
// Odaktaki uygulama, penceresi ve metin imleci Erişilebilirlik API'sinden okunur; seçilen öğe hedef uygulama yeniden
// öne alındıktan sonra ⌘V ile yapıştırılır. İkisi de Erişilebilirlik izni ister: izin yokken geçmiş ekranın altındaki
// panelde açılır ve seçilen öğe yalnız panoya kopyalanır.
import { globalShortcut, screen, shell, systemPreferences } from 'electron'
import type { IntegrationState } from '@shared/types'
import type { Rect } from '@shared/placement'
import { electronAccelerator } from '@shared/accelerator'
import type { FocusInfo } from '../shell'
import { store } from '../store'
import { currentShortcut } from '../shortcut'
import { debug } from '../log'
import { NativeDesktop } from './native'

type Darwin = typeof import('./darwin-api')

const CLIPBOARD_POLL_MS = 300
/** İzin Sistem Ayarları'ndan verilince Kurulum bölümü kendiliğinden güncellensin diye izin durumu yoklanır. */
const TRUST_POLL_MS = 2000
const ACTIVATE_SETTLE_MS = 120
const ACCESSIBILITY_SETTINGS =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export class MacDesktop extends NativeDesktop {
  private api: Darwin | null = null
  private registered: string | null = null
  private paused = false
  private taken = false
  private trusted = false
  private timers: NodeJS.Timeout[] = []
  /** Kısayola basıldığı andaki hedef pencerenin çerçevesi (izleme sırasında pencerenin varlığı süreçle denetlenir). */
  private targetFrame: Rect | undefined

  get active(): boolean {
    return this.api !== null
  }

  async start(): Promise<void> {
    try {
      this.api = await import('./darwin-api')
    } catch (err) {
      console.error('macOS API yüklenemedi:', err)
      return
    }
    this.trusted = this.api.accessibilityTrusted()
    this.applyShortcut()
    let count = this.api.pasteboardChangeCount()
    this.timers.push(
      setInterval(() => {
        const next = this.api!.pasteboardChangeCount()
        if (next === count) return
        count = next
        this.emit('clipboard-changed')
      }, CLIPBOARD_POLL_MS),
      setInterval(() => {
        const trusted = this.api!.accessibilityTrusted()
        if (trusted === this.trusted) return
        this.trusted = trusted
        this.emit('changed')
      }, TRUST_POLL_MS)
    )
  }

  stop(): void {
    this.releaseShortcut()
    for (const t of this.timers) clearInterval(t)
    this.timers = []
  }

  // --- kısayol ---

  private applyShortcut(): void {
    this.releaseShortcut()
    this.taken = false
    if (!store.integration.shortcutEnabled || this.paused || !this.api) return
    const electron = electronAccelerator(currentShortcut())
    if (electron && globalShortcut.register(electron, () => this.trigger()))
      this.registered = electron
    else this.taken = true
  }

  private releaseShortcut(): void {
    if (this.registered) globalShortcut.unregister(this.registered)
    this.registered = null
  }

  private trigger(): void {
    try {
      this.emit('shortcut', this.focusInfo())
    } catch (err) {
      console.error('Odak bilgisi alınamadı:', err)
      this.emit('shortcut', null)
    }
  }

  // --- odak ve imleç ---

  private focusInfo(): FocusInfo {
    const cursor = screen.getCursorScreenPoint()
    const monitors = screen.getAllDisplays().map((d) => ({ bounds: d.bounds, work: d.workArea }))
    const base: FocusInfo = { pointer: [cursor.x, cursor.y], monitors }
    this.trusted = this.api!.accessibilityTrusted()
    const focus = this.trusted ? this.api!.focusedElement() : null
    if (!focus) return base
    this.targetFrame = focus.frame ?? undefined
    const info: FocusInfo = {
      ...base,
      id: focus.pid,
      pid: focus.pid,
      wmClass: focus.role ?? '',
      frame: this.targetFrame,
      own: focus.pid === process.pid,
      focused: true,
      textInput: focus.textInput,
      caret: focus.caret ?? undefined
    }
    debug('focus', JSON.stringify(info))
    return info
  }

  async windowInfo(id: number): Promise<FocusInfo | null> {
    try {
      process.kill(id, 0)
    } catch {
      return null
    }
    const cursor = screen.getCursorScreenPoint()
    return { pointer: [cursor.x, cursor.y], id, frame: this.targetFrame, focused: true }
  }

  // --- yapıştırma ---

  async paste(pid: number): Promise<boolean> {
    const api = this.api
    if (!api || !api.accessibilityTrusted()) return false
    api.activateProcess(pid)
    await sleep(ACTIVATE_SETTLE_MS)
    api.sendPaste()
    return true
  }

  // --- Kurulum bölümü ---

  async state(): Promise<IntegrationState> {
    const enabled = store.integration.shortcutEnabled
    if (this.api) this.trusted = this.api.accessibilityTrusted()
    return {
      platform: 'darwin',
      gnome: false,
      session: 'unknown',
      extension: 'active',
      conflicts: [],
      shortcut: enabled ? currentShortcut() : '',
      tookOver: false,
      shortcutInUse: this.taken,
      ready: this.active && enabled && !this.taken && this.trusted,
      accessibility: this.trusted
    }
  }

  async requestAccess(): Promise<void> {
    systemPreferences.isTrustedAccessibilityClient(true)
    await shell.openExternal(ACCESSIBILITY_SETTINGS)
  }

  async setShortcut(accel: string): Promise<void> {
    store.updateIntegration({ shortcut: accel, shortcutEnabled: true })
    this.applyShortcut()
    this.emit('changed')
  }

  async pauseShortcut(paused: boolean): Promise<void> {
    this.paused = paused
    this.applyShortcut()
  }
}
