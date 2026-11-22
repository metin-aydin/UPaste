// Windows masaüstü katmanı. Kısayol Windows tuşunu içeriyorsa (varsayılan Win+V) alt düzey klavye kancasıyla alınır:
// Win+V Windows'un kendi pano geçmişine ayrılmıştır ve sıradan kısayol olarak kaydedilemez; kanca tuşu Windows'a
// ulaşmadan yutar. Diğer kısayollar Electron'un globalShortcut'ıyla kaydedilir.
//
// Geçmiş penceresi odak almaz (WS_EX_NOACTIVATE): hedef pencere önde kalır, metin alanındaki imleç yanıp sönmeyi
// sürdürür. Geçmiş açıkken tuşlar aynı alt düzey kancayla yakalanır: gezinme tuşları arayüze iletilir, yazı tuşları
// arama metnini oluşturur (GNOME eklentisinin görünmez giriş kutusunun karşılığı); dışarı tıklama fare kancasıyla
// izlenir. Seçilen öğe hedef pencerede Ctrl+V ile yapıştırılır.
import { clipboard, globalShortcut, screen } from 'electron'
import type { IntegrationState } from '@shared/types'
import type { Rect } from '@shared/placement'
import { electronAccelerator, parseAccelerator, windowsVirtualKey } from '@shared/accelerator'
import type { CapturedKey, FocusInfo } from '../shell'
import { store } from '../store'
import { currentShortcut } from '../shortcut'
import { debug } from '../log'
import { NativeDesktop } from './native'

type Win32 = typeof import('./win32-api')
type KeyEvent = import('./win32-api').KeyEvent

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

/** Geçmiş açıkken kancanın kipi: tuş yakalama (gezinme, yazmayı başlatan harf) ya da arama metni yazımı. */
type KeyMode = 'idle' | 'capture' | 'typing'

const VK = {
  BACK: 0x08,
  TAB: 0x09,
  RETURN: 0x0d,
  ESCAPE: 0x1b,
  PRIOR: 0x21,
  NEXT: 0x22,
  END: 0x23,
  HOME: 0x24,
  LEFT: 0x25,
  UP: 0x26,
  RIGHT: 0x27,
  DOWN: 0x28,
  DELETE: 0x2e,
  P: 0x50,
  V: 0x56
}

/** Durum değiştirici tuşlar kancadan olduğu gibi geçer. */
const MODIFIER_KEYS = new Set([
  0x10, 0x11, 0x12, 0x14, 0x5b, 0x5c, 0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5
])

/** Yakalama kipinde arayüze iletilen gezinme tuşları (GNOME eklentisinin NAV_KEYS listesiyle aynı adlar). */
function navKey(vk: number, shift: boolean, control: boolean): string | null {
  if (control) return vk === VK.P ? 'ctrl+p' : null
  switch (vk) {
    case VK.UP:
      return 'up'
    case VK.DOWN:
      return 'down'
    case VK.LEFT:
      return 'left'
    case VK.RIGHT:
      return 'right'
    case VK.PRIOR:
      return 'pageup'
    case VK.NEXT:
      return 'pagedown'
    case VK.HOME:
      return 'home'
    case VK.END:
      return 'end'
    case VK.RETURN:
      return shift ? 'shift+enter' : 'enter'
    case VK.TAB:
      return shift ? 'shift+tab' : 'tab'
    case VK.BACK:
      return 'backspace'
    case VK.DELETE:
      return shift ? 'shift+delete' : 'delete'
    case VK.ESCAPE:
      return 'escape'
    default:
      return null
  }
}

/** Arama metninin son sözcüğünü (sondaki boşluklarla birlikte) siler. */
const dropWord = (text: string): string => text.replace(/\S*\s*$/u, '')

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
  /** Windows tuşu içermeyen kısayol: geçmiş açıkken kancadan geçirilir, globalShortcut onu alabilsin. */
  private plainCombo: HookCombo | null = null
  private mode: KeyMode = 'idle'
  /** Kancanın yuttuğu basılı tuşlar: bırakılmaları da hedef pencereye ulaşmasın. */
  private held = new Set<number>()
  /** Yazmayı başlatan tuşun ürettiği metin; yazım başlayınca arama metnine eklenir. */
  private pendingText = ''
  private query = ''
  private horizontal = false
  private unhookMouse: (() => void) | null = null
  /** Dışarı tıklamada izlenen alan (DIP). */
  private inside: Rect | null = null

  get active(): boolean {
    return this.api !== null
  }

  override get canCapture(): boolean {
    return this.active
  }

  override get canType(): boolean {
    return this.active
  }

  override get canWatchClicks(): boolean {
    return this.active
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
    this.mode = 'idle'
    this.unhook?.()
    this.unhook = null
    this.unhookMouse?.()
    this.unhookMouse = null
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
    const combo =
      vk === null
        ? null
        : {
            vk,
            control: modifiers.includes('Control'),
            alt: modifiers.includes('Alt'),
            shift: modifiers.includes('Shift')
          }
    if (modifiers.includes('Super') && combo) {
      this.combo = combo
      if (!this.syncHook()) this.taken = true
      return
    }
    this.plainCombo = combo
    this.syncHook()
    const electron = electronAccelerator(accel)
    if (electron && globalShortcut.register(electron, () => this.trigger()))
      this.registered = electron
    else this.taken = true
  }

  /**
   * Klavye kancası yalnız gerektiğinde kuruludur: kısayol Windows tuşunu içeriyorsa ya da geçmiş açıkken tuşlar
   * yakalanıyorsa. Kurulamazsa false.
   */
  private syncHook(): boolean {
    // Yutulan tuşlar bırakılana dek kanca kalır; bırakma olayları da hedef pencereye ulaşmaz.
    const needed = this.combo !== null || this.mode !== 'idle' || this.held.size > 0
    if (needed && !this.unhook && this.api) {
      try {
        this.unhook = this.api.installKeyboardHook((down, event) => this.onKey(down, event))
      } catch (err) {
        console.error('Klavye kancası kurulamadı:', err)
        return false
      }
    } else if (!needed && this.unhook) {
      this.unhook()
      this.unhook = null
    }
    return true
  }

  private releaseShortcut(): void {
    this.combo = null
    this.plainCombo = null
    if (this.registered) globalShortcut.unregister(this.registered)
    this.registered = null
  }

  /** Kancaya gelen her tuş olayı: kısayolsa yutulur ve geçmiş açılır; geçmiş açıkken tuşlar yakalanır. */
  private onKey(down: boolean, event: KeyEvent): boolean {
    const api = this.api!
    if (event.flags & api.LLKHF_INJECTED) return false
    if (!down && event.vkCode === this.swallowed) {
      this.swallowed = 0
      return true
    }
    if (!down && this.held.delete(event.vkCode)) {
      if (this.mode === 'idle' && this.held.size === 0) setImmediate(() => this.syncHook())
      return true
    }
    if (this.shortcutKey(down, event)) return true
    if (!down || this.mode === 'idle') return false
    if (this.captureKey(event)) {
      this.held.add(event.vkCode)
      return true
    }
    return false
  }

  private shortcutKey(down: boolean, event: KeyEvent): boolean {
    const api = this.api!
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

  /** Kısayolun basılı olduğu tuş birleşimi mi (Windows tuşu içermeyen kısayol için). */
  private matchesPlain(vk: number, control: boolean, alt: boolean, shift: boolean): boolean {
    const c = this.plainCombo
    return !!c && c.vk === vk && c.control === control && c.alt === alt && c.shift === shift
  }

  /**
   * Geçmiş açıkken basılan tuş. Windows tuşlu birleşimler, Alt+Tab gibi Alt kısayolları, durum değiştiriciler ve
   * geçmişi açan kısayol olduğu gibi geçer; gezinme ve yazı tuşları yutulup arayüze iletilir. Yutulduysa true.
   */
  private captureKey(event: KeyEvent): boolean {
    const api = this.api!
    const vk = event.vkCode
    if (MODIFIER_KEYS.has(vk)) return false
    const control = api.keyDown(api.VK_CONTROL)
    const alt = api.keyDown(api.VK_MENU)
    const shift = api.keyDown(api.VK_SHIFT)
    if (api.keyDown(api.VK_LWIN) || api.keyDown(api.VK_RWIN)) return false
    if (alt && !control) return false
    if (this.matchesPlain(vk, control, alt, shift)) return false
    // Ctrl+Alt Windows'ta AltGr'dir: yazı üretir.
    const plainControl = control && !alt
    return this.mode === 'capture'
      ? this.captureNav(event, shift, plainControl)
      : this.typeKey(event, shift, plainControl)
  }

  private captureNav(event: KeyEvent, shift: boolean, control: boolean): boolean {
    const nav = navKey(event.vkCode, shift, control)
    if (nav) {
      this.emitKey({ key: nav, keycode: 0, modifiers: 0 })
      return true
    }
    if (control) return false
    const text = this.api!.keyText(event.vkCode, event.scanCode)
    if (!text) return false
    this.pendingText = text
    this.emitKey({ key: 'text', keycode: event.vkCode, modifiers: 0 })
    return true
  }

  /** Arama metni yazılırken: GNOME eklentisinin giriş kutusundaki davranışın aynısı. */
  private typeKey(event: KeyEvent, shift: boolean, control: boolean): boolean {
    const vk = event.vkCode
    const empty = this.query === ''
    let key: string | null = null
    if (control) {
      if (vk === VK.P) key = 'ctrl+p'
      else if (vk === VK.V) {
        void clipboard.readText().then((text) => {
          if (this.mode === 'typing') this.setQuery(this.query + text.replace(/\s+/gu, ' '))
        })
        return true
      } else if (vk === VK.BACK) {
        this.setQuery(dropWord(this.query))
        return true
      } else return true
    } else if (vk === VK.UP) key = 'up'
    else if (vk === VK.DOWN) key = 'down'
    else if (vk === VK.PRIOR) key = 'pageup'
    else if (vk === VK.NEXT) key = 'pagedown'
    else if (vk === VK.RETURN) key = shift ? 'shift+enter' : 'enter'
    else if (vk === VK.TAB) key = shift ? 'shift+tab' : 'tab'
    else if (vk === VK.DELETE) {
      if (!shift && !empty) return true
      key = shift ? 'shift+delete' : 'delete'
    } else if (vk === VK.LEFT || vk === VK.RIGHT) {
      if (!this.horizontal) return true
      key = vk === VK.LEFT ? 'left' : 'right'
    } else if (vk === VK.HOME || vk === VK.END) {
      if (!empty) return true
      key = vk === VK.HOME ? 'home' : 'end'
    } else if (vk === VK.ESCAPE) {
      // Önce arama temizlenir; boşken Esc geçmişi kapatır.
      if (!empty) {
        this.setQuery('')
        return true
      }
      key = 'escape'
    } else if (vk === VK.BACK) {
      this.setQuery(Array.from(this.query).slice(0, -1).join(''))
      return true
    }
    if (key) {
      this.emitKey({ key, keycode: 0, modifiers: 0 })
      return true
    }
    const text = this.api!.keyText(vk, event.scanCode)
    if (!text) return false
    this.setQuery(this.query + text)
    return true
  }

  private setQuery(text: string): void {
    if (text === this.query) return
    this.query = text
    setImmediate(() => this.emit('search', text))
  }

  /** Kanca hızlı dönsün diye olay bir sonraki turda yayılır. */
  private emitKey(key: CapturedKey): void {
    if (key.key === 'escape') this.mode = 'idle'
    setImmediate(() => {
      if (key.key === 'escape') this.syncHook()
      this.emit('key', key)
    })
  }

  // --- geçmiş açıkken tuş yakalama, arama ve dışarı tıklama ---

  override async captureKeys(capture = false): Promise<void> {
    if (capture) this.mode = 'capture'
    else if (this.mode === 'capture') this.mode = 'idle'
    this.pendingText = ''
    this.syncHook()
  }

  override async startTyping(keycode = 0, modifiers = 0, horizontal = false): Promise<void> {
    debug('typing', keycode, modifiers)
    const start = keycode ? this.pendingText : ''
    this.pendingText = ''
    this.horizontal = horizontal
    if (this.mode === 'typing') return
    this.mode = 'typing'
    this.query = ''
    this.syncHook()
    if (start) this.setQuery(start)
  }

  override async stopTyping(): Promise<void> {
    if (this.mode !== 'typing') return
    this.mode = 'idle'
    this.query = ''
    this.syncHook()
  }

  override async watchClicks(inside: Rect | null = null): Promise<void> {
    this.inside = inside
    if (inside && !this.unhookMouse && this.api) {
      try {
        this.unhookMouse = this.api.installMouseHook((x, y) => this.onClick(x, y))
      } catch (err) {
        console.error('Fare kancası kurulamadı:', err)
      }
    } else if (!inside && this.unhookMouse) {
      this.unhookMouse()
      this.unhookMouse = null
    }
  }

  /** Görünen alanın dışına basıldı: bir kez haber verilir (tıklama hedefe olduğu gibi ulaşır). */
  private onClick(x: number, y: number): void {
    const area = this.inside
    if (!area) return
    const p = screen.screenToDipPoint({ x, y })
    if (p.x >= area.x && p.x < area.x + area.width && p.y >= area.y && p.y < area.y + area.height)
      return
    this.inside = null
    setImmediate(() => {
      void this.watchClicks(null)
      this.emit('clicked-outside')
    })
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
    const foreground = api.foregroundWindow()
    const owner = foreground ? api.windowProcess(foreground).pid : 0
    return {
      pointer: [cursor.x, cursor.y],
      id,
      frame: frame ? this.toDip(frame) : undefined,
      focused: foreground === id,
      // Geçmiş penceresi odak almadığı için öndeki pencere hedeften başkasıysa kullanıcı başka pencereye geçmiştir.
      focus: { id: foreground, pid: owner, wmClass: '', own: owner === process.pid }
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
