// Windows masaüstü katmanı. Kısayol Windows tuşunu içeriyorsa (varsayılan Win+V) alt düzey klavye kancasıyla alınır:
// Win+V Windows'un kendi pano geçmişine ayrılmıştır ve sıradan kısayol olarak kaydedilemez; kanca tuşu Windows'a
// ulaşmadan yutar. Diğer kısayollar Electron'un globalShortcut'ıyla kaydedilir. Geçmiş penceresi odağı alır; seçilen
// öğe, hedef pencere yeniden öne alındıktan sonra Ctrl+V ile yapıştırılır.
import { globalShortcut, screen } from 'electron'
import type { IntegrationState } from '@shared/types'
import type { Rect } from '@shared/placement'
import { electronAccelerator, parseAccelerator, windowsVirtualKey } from '@shared/accelerator'
import type { FocusInfo } from '../shell'
import { store } from '../store'
import { currentShortcut } from '../shortcut'
import { debug } from '../log'
import { NativeDesktop } from './native'

type Win32 = typeof import('./win32-api')

const CLIPBOARD_POLL_MS = 300
const FOCUS_WAIT_MS = 600
const FOCUS_SETTLE_MS = 40
/** Win tuşu bırakılınca Başlat menüsü açılmasın diye gönderilen atanmamış tuş. */
const VK_MASK = 0xff
/** UPaste'in gönderdiği tuş olaylarının işareti (kanca bunları yok sayar). */
const OWN_INPUT = 0x55504153

interface HookCombo {
  vk: number
  control: boolean
  alt: boolean
  shift: boolean
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export class WindowsDesktop extends NativeDesktop {
  private api: Win32 | null = null
  private unhook: (() => void) | null = null
  private combo: HookCombo | null = null
  private registered: string | null = null
  private swallowed = 0
  private paused = false
  /** Kısayol kaydedilemedi (başka bir uygulama tutuyor). */
  private taken = false
  private clipboardTimer: NodeJS.Timeout | null = null

  get active(): boolean {
    return this.api !== null
  }

  async start(): Promise<void> {
    try {
      this.api = await import('./win32-api')
    } catch (err) {
      console.error('Windows API yüklenemedi:', err)
      return
    }
    this.applyShortcut()
    let sequence = this.api.clipboardSequence()
    this.clipboardTimer = setInterval(() => {
      const next = this.api!.clipboardSequence()
      if (next === sequence) return
      sequence = next
      this.emit('clipboard-changed')
    }, CLIPBOARD_POLL_MS)
  }

  /** Uygulama kapanırken kanca, kısayol ve pano yoklaması bırakılır. */
  stop(): void {
    this.releaseShortcut()
    this.unhook?.()
    this.unhook = null
    if (this.clipboardTimer) clearInterval(this.clipboardTimer)
    this.clipboardTimer = null
  }

  // --- kısayol ---

  private applyShortcut(): void {
    this.releaseShortcut()
    this.taken = false
    if (!store.integration.shortcutEnabled || this.paused || !this.api) return
    const accel = currentShortcut()
    const { modifiers, key } = parseAccelerator(accel)
    const vk = windowsVirtualKey(key)
    if (modifiers.includes('Super') && vk !== null) {
      this.combo = {
        vk,
        control: modifiers.includes('Control'),
        alt: modifiers.includes('Alt'),
        shift: modifiers.includes('Shift')
      }
      if (!this.unhook) {
        try {
          this.unhook = this.api.installKeyboardHook((down, event) => this.onKey(down, event))
        } catch (err) {
          console.error('Klavye kancası kurulamadı:', err)
          this.taken = true
        }
      }
      return
    }
    this.unhook?.()
    this.unhook = null
    const electron = electronAccelerator(accel)
    if (electron && globalShortcut.register(electron, () => this.trigger()))
      this.registered = electron
    else this.taken = true
  }

  private releaseShortcut(): void {
    this.combo = null
    if (this.registered) globalShortcut.unregister(this.registered)
    this.registered = null
  }

  /** Kancaya gelen her tuş olayı: kısayolsa yutulur ve geçmiş açılır. */
  private onKey(down: boolean, event: { vkCode: number; flags: number }): boolean {
    const api = this.api!
    if (event.flags & api.LLKHF_INJECTED) return false
    if (!down && event.vkCode === this.swallowed) {
      this.swallowed = 0
      return true
    }
    const combo = this.combo
    if (!down || !combo || event.vkCode !== combo.vk) return false
    const win = api.keyDown(api.VK_LWIN) || api.keyDown(api.VK_RWIN)
    if (
      !win ||
      api.keyDown(api.VK_CONTROL) !== combo.control ||
      api.keyDown(api.VK_MENU) !== combo.alt ||
      api.keyDown(api.VK_SHIFT) !== combo.shift
    )
      return false
    // Basılı tutulan tuşun tekrarları da yutulur ama geçmişi yeniden açmaz.
    if (this.swallowed !== event.vkCode) {
      this.swallowed = event.vkCode
      api.sendKeys(
        [
          { vk: VK_MASK, up: false },
          { vk: VK_MASK, up: true }
        ],
        OWN_INPUT
      )
      setImmediate(() => this.trigger())
    }
    return true
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

  private toDip(r: { x: number; y: number; width: number; height: number }): Rect {
    return screen.screenToDipRect(null, r)
  }

  private focusInfo(): FocusInfo {
    const api = this.api!
    const cursor = screen.getCursorScreenPoint()
    const monitors = screen.getAllDisplays().map((d) => ({ bounds: d.bounds, work: d.workArea }))
    const base: FocusInfo = { pointer: [cursor.x, cursor.y], monitors }
    const hwnd = api.foregroundWindow()
    if (!hwnd) return base
    const { pid, thread } = api.windowProcess(hwnd)
    const own = pid === process.pid
    const frame = api.windowFrame(hwnd)
    const caret = own ? null : api.caretRect(hwnd, thread)
    const info: FocusInfo = {
      ...base,
      id: hwnd,
      pid,
      wmClass: api.windowClass(hwnd),
      frame: frame ? this.toDip(frame) : undefined,
      own,
      focused: true,
      textInput: caret !== null,
      caret: caret ? this.toDip(caret) : undefined
    }
    debug('focus', JSON.stringify(info))
    return info
  }

  async windowInfo(id: number): Promise<FocusInfo | null> {
    const api = this.api
    if (!api || !api.isWindow(id)) return null
    const cursor = screen.getCursorScreenPoint()
    const frame = api.windowFrame(id)
    return {
      pointer: [cursor.x, cursor.y],
      id,
      frame: frame ? this.toDip(frame) : undefined,
      focused: api.foregroundWindow() === id
    }
  }

  // --- yapıştırma ---

  async paste(windowId: number): Promise<boolean> {
    const api = this.api
    if (!api || !api.isWindow(windowId)) return false
    api.setForegroundWindow(windowId)
    const start = Date.now()
    while (api.foregroundWindow() !== windowId) {
      if (Date.now() - start > FOCUS_WAIT_MS) return false
      await sleep(10)
    }
    await sleep(FOCUS_SETTLE_MS)
    // Windows uygulamalarının hepsi (konsol dahil) Ctrl+V ile yapıştırır.
    return api.sendKeys(
      [
        { vk: api.VK_CONTROL, up: false },
        { vk: api.VK_V, up: false },
        { vk: api.VK_V, up: true },
        { vk: api.VK_CONTROL, up: true }
      ],
      OWN_INPUT
    )
  }

  // --- Kurulum bölümü ---

  async state(): Promise<IntegrationState> {
    const enabled = store.integration.shortcutEnabled
    return {
      platform: 'win32',
      gnome: false,
      session: 'unknown',
      extension: 'active',
      conflicts: [],
      shortcut: enabled ? currentShortcut() : '',
      tookOver: false,
      shortcutInUse: this.taken,
      ready: this.active && enabled && !this.taken
    }
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
