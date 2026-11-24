// macOS masaüstü katmanı. Kısayol Electron'un globalShortcut'ıyla kaydedilir (varsayılan ⌘⇧V; ⌘V yapıştırmadır).
// Odaktaki uygulama, penceresi ve metin imleci Erişilebilirlik API'sinden okunur; seçilen öğe hedef uygulama yeniden
// öne alındıktan sonra ⌘V ile yapıştırılır. İkisi de Erişilebilirlik izni ister: izin yokken geçmiş ekranın altındaki
// panelde açılır ve seçilen öğe yalnız panoya kopyalanır.
import { BrowserWindow, globalShortcut, screen, shell, systemPreferences } from 'electron'
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
const KEY_WINDOW_TIMEOUT_MS = 200
const ACCESSIBILITY_SETTINGS =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'

/** Bundan alçak metin alanı tek satırlık sayılır: imleç bilinmezse küçük pencere alanın altında açılır. */
const SINGLE_LINE_MAX = 64
const LINE_HEIGHT = 20

/** Chromium erişilebilirlik ağacını kurarken odak bu rollerde görünür (ya da hiç görünmez). */
const UNBUILT_ROLES = new Set<string | null>([null, 'AXGroup', 'AXWebArea'])
/** Ağaç kurulurken odak bu aralıklarla yeniden sorulur (toplam ~600 ms). */
const TREE_RETRY_MS = [150, 200, 250]
/** Öne gelen uygulamanın erişilebilirlik ağacı bu aralıkla açık tutulur. */
const WARM_POLL_MS = 250

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * İmleci okunamayan metin alanında küçük pencerenin dayanacağı dikdörtgen: tek satırlık alanın kendisi; çok satırlı
 * alanda fare alanın içindeyse fare satırı, değilse alanın ilk satırı.
 */
function fieldAnchor(field: Rect, [px, py]: [number, number]): Rect {
  if (field.height <= SINGLE_LINE_MAX) return { ...field, width: 1 }
  const inside =
    px >= field.x && px < field.x + field.width && py >= field.y && py < field.y + field.height
  return inside
    ? { x: px, y: py - LINE_HEIGHT / 2, width: 1, height: LINE_HEIGHT }
    : { x: field.x + 8, y: field.y + 4, width: 1, height: LINE_HEIGHT }
}

/** İki dikdörtgeni kapsayan en küçük dikdörtgen (biri yoksa öteki). */
function union(a: Rect | null, b: Rect | null): Rect | undefined {
  if (!a || !b) return a ?? undefined
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y
  }
}

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
      }, TRUST_POLL_MS),
      setInterval(() => {
        if (this.trusted) this.api!.warmAccessibility()
      }, WARM_POLL_MS)
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

  private async trigger(): Promise<void> {
    try {
      this.emit('shortcut', await this.focusInfo())
    } catch (err) {
      console.error('Odak bilgisi alınamadı:', err)
      this.emit('shortcut', null)
    }
  }

  // --- odak ve imleç ---

  private async focusInfo(): Promise<FocusInfo> {
    const cursor = screen.getCursorScreenPoint()
    const pointer: [number, number] = [cursor.x, cursor.y]
    const monitors = screen.getAllDisplays().map((d) => ({ bounds: d.bounds, work: d.workArea }))
    const base: FocusInfo = { pointer, monitors }
    this.trusted = this.api!.accessibilityTrusted()
    if (!this.trusted) {
      debug('focus', 'accessibility access not granted')
      return base
    }
    let focus = this.api!.focusedElement()
    debug('ax', JSON.stringify(focus))
    // Chromium ağacı kapalıyken odak hiç görünmez ya da yalnız web alanında/onu saran grupta görünür; ağaç kurulana
    // dek birkaç kez yeniden sorulur.
    for (const wait of TREE_RETRY_MS) {
      if (!focus || !focus.pid || focus.caret || !UNBUILT_ROLES.has(focus.role)) break
      await sleep(wait)
      focus = this.api!.focusedElement()
      debug('ax retry', JSON.stringify(focus))
    }
    if (!focus || !focus.pid) return base
    // Bazı uygulamaların (Chrome) AXFocusedWindow çerçevesi araç çubuğunu dışarıda bırakır; metin alanı da pencereye
    // dahil sayılsın diye çerçeve alanı kapsayacak kadar genişletilir.
    this.targetFrame = union(focus.frame, focus.field)
    // İmleç okunamayan metin alanında küçük pencere alanın kendisine göre yerleşir.
    const caret =
      focus.caret ?? (focus.textInput && focus.field ? fieldAnchor(focus.field, pointer) : null)
    const info: FocusInfo = {
      ...base,
      id: focus.pid,
      pid: focus.pid,
      wmClass: focus.role ?? '',
      frame: this.targetFrame,
      own: focus.pid === process.pid,
      focused: true,
      textInput: focus.textInput,
      caret: caret ?? undefined
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

  /** Geçmiş paneli uygulama etkinleşmeden tuşları alır; hedef uygulama önde ve imleci yanıp sönmeye devam eder. */
  async focusOwnWindow(title?: string): Promise<boolean> {
    const own = BrowserWindow.getAllWindows().find(
      (w) => !w.isDestroyed() && w.getTitle() === title
    )
    if (!own || !this.api) return false
    if (!own.isFocused()) {
      // Panel bir sonraki çalışma döngüsünde anahtar pencere olur; `focus` olayı beklenir.
      const keyed = new Promise<void>((resolve) => {
        const timer = setTimeout(done, KEY_WINDOW_TIMEOUT_MS)
        function done(): void {
          clearTimeout(timer)
          own!.removeListener('focus', done)
          resolve()
        }
        own.once('focus', done)
      })
      if (!this.api.makeKeyPanel(own.getNativeWindowHandle())) return false
      await keyed
    }
    if (own.isDestroyed()) return false
    own.webContents.focus()
    return own.isFocused()
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
