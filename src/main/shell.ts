// GNOME Shell eklentisiyle iletişim. Uygulama oturum veri yolunda `io.github.metin_aydin.UPaste` adını alır;
// eklenti yalnız bu adın sahibinin çağrılarını kabul eder ve sinyallerini yalnız ona gönderir.
import { EventEmitter } from 'events'
import { connectSessionBus, DBusError, type DBusConnection } from './dbus/connection'
import { unwrap, type Message } from './dbus/wire'
import type { Rect } from '@shared/placement'

export const APP_BUS_NAME = 'io.github.metin_aydin.UPaste'
export const APP_OBJECT_PATH = '/io/github/metin_aydin/UPaste'
const SHELL_NAME = 'org.gnome.Shell'
const EXT_PATH = '/io/github/metin_aydin/UPaste'
const EXT_IFACE = 'io.github.metin_aydin.UPaste.Shell'
/** Uygulamayla gelen eklentinin arayüz sürümü (metadata.json `upaste-api`). */
export const EXTENSION_API = 5
const ACCESS_RETRIES = 20
const ACCESS_RETRY_MS = 100

export type PasteKeys = 'shift+insert' | 'ctrl+v' | 'ctrl+shift+v'

/** Eklentinin bildirdiği odak bilgisi. Pencere yoksa yalnız `pointer` vardır. */
export interface FocusInfo {
  pointer: [number, number]
  id?: number
  pid?: number
  client?: 'x11' | 'wayland'
  wmClass?: string
  frame?: Rect
  buffer?: Rect
  monitor?: number
  /** Pencere UPaste'in kendi penceresi. */
  own?: boolean
  /** Pencere klavye odağında. */
  focused?: boolean
  /** Giriş yöntemine göre bir metin alanı odakta. */
  textInput?: boolean
  /** Metin imlecinin ekran konumu. */
  caret?: Rect
  /** Kısayolda istenen taze imleç konumu geldi (gelmediyse `caret` uygulamanın son bildirdiğidir). */
  caretFresh?: boolean
  /** Mutter'ın monitörleri: ekran dikdörtgeni ve paneller/rıhtım düşülmüş çalışma alanı. */
  monitors?: { bounds: Rect; work: Rect }[]
  /** O an klavye odağındaki pencere (GetWindowInfo, API 5; `id` 0: hiçbir pencere). */
  focus?: { id: number; pid: number; wmClass: string; own: boolean }
}

const toRect = (v: unknown): Rect | undefined => {
  if (!Array.isArray(v) || v.length !== 4) return undefined
  const [x, y, width, height] = v.map(Number)
  return { x, y, width, height }
}

export function parseFocusInfo(raw: unknown): FocusInfo {
  const d = (unwrap(raw) ?? {}) as Record<string, unknown>
  const pointer = Array.isArray(d['pointer']) ? (d['pointer'] as number[]) : [0, 0]
  return {
    pointer: [Number(pointer[0]) || 0, Number(pointer[1]) || 0],
    id: d['id'] !== undefined ? Number(d['id']) : undefined,
    pid: d['pid'] !== undefined ? Number(d['pid']) : undefined,
    client: d['client'] === 'x11' ? 'x11' : d['client'] === 'wayland' ? 'wayland' : undefined,
    wmClass: typeof d['wmClass'] === 'string' ? d['wmClass'] : undefined,
    frame: toRect(d['frame']),
    buffer: toRect(d['buffer']),
    monitor: d['monitor'] !== undefined ? Number(d['monitor']) : undefined,
    own: d['own'] === true,
    focused: d['focused'] === true,
    textInput: d['textInput'] === true,
    caret: toRect(d['caret']),
    caretFresh: d['caretFresh'] === undefined ? undefined : d['caretFresh'] === true,
    monitors: Array.isArray(d['monitors'])
      ? (d['monitors'] as number[][])
          .filter((m) => Array.isArray(m) && m.length === 8)
          .map((m) => ({ bounds: toRect(m.slice(0, 4))!, work: toRect(m.slice(4))! }))
      : undefined,
    focus:
      d['focusId'] !== undefined
        ? {
            id: Number(d['focusId']),
            pid: Number(d['focusPid'] ?? 0),
            wmClass: typeof d['focusClass'] === 'string' ? d['focusClass'] : '',
            own: d['focusOwn'] === true
          }
        : undefined
  }
}

/** Geçmiş açıkken eklentinin yakaladığı tuş. `text`: yazı tuşu (tuş kodu ve Shift/AltGr ile). */
export interface CapturedKey {
  key: string
  keycode: number
  modifiers: number
}

export interface AppService {
  /** Odaktaki metin alanı için geçmişi açar (eklentisiz kısayollar ve `gdbus` için). */
  show(): void
  openSettings(): void
}

class ShellBridge extends EventEmitter {
  bus: DBusConnection | null = null
  private extensionVersion = 0

  /** Oturum veri yoluna bağlanır ve adı alır. Ad başka bir UPaste'teyse false döner. */
  async start(service: AppService): Promise<boolean> {
    const bus = await connectSessionBus()
    this.bus = bus
    bus.on('error', (err) => console.error('D-Bus:', err))
    bus.exportInterface(APP_OBJECT_PATH, {
      name: 'io.github.metin_aydin.UPaste.App',
      methods: {
        Show: { handler: () => service.show() },
        OpenSettings: { handler: () => service.openSettings() }
      }
    })
    bus.on('signal', (msg: Message) => this.onSignal(msg))
    await bus.addMatch(
      `type='signal',sender='${SHELL_NAME}',path='${EXT_PATH}',interface='${EXT_IFACE}'`
    )
    await bus.addMatch(
      `type='signal',sender='org.freedesktop.DBus',member='NameOwnerChanged',arg0='${SHELL_NAME}'`
    )
    // 4: DO_NOT_QUEUE. Sonuç 1 (birincil sahip) ya da 4 (zaten sahip) değilse başka bir örnek çalışıyor.
    const result = await bus.requestName(APP_BUS_NAME, 4)
    return result === 1 || result === 4
  }

  private onSignal(msg: Message): void {
    if (msg.member === 'NameOwnerChanged') {
      // Kabuk yeniden başladı (X11'de Alt+F2 r): eklenti yeniden yüklenir, sürüm yeniden sorulur.
      this.extensionVersion = 0
      this.emit('shell-restarted')
      return
    }
    if (msg.interface !== EXT_IFACE) return
    if (msg.member === 'ShortcutPressed') this.emit('shortcut', parseFocusInfo(msg.body[0]))
    else if (msg.member === 'ClipboardChanged') this.emit('clipboard-changed')
    else if (msg.member === 'ClickedOutside') this.emit('clicked-outside')
    else if (msg.member === 'KeyPressed') {
      const [key, keycode, modifiers] = msg.body as [string, number, number]
      this.emit('key', { key, keycode, modifiers } satisfies CapturedKey)
    } else if (msg.member === 'SearchChanged') this.emit('search', String(msg.body[0] ?? ''))
  }

  /**
   * Eklenti yöntemini çağırır. Ad yeni alındığında eklenti sahibi henüz görmemiş olabilir ve çağrıyı reddeder;
   * bu durumda kısa aralıklarla yeniden denenir.
   */
  private async call(
    member: string,
    signature?: string,
    body?: unknown[],
    timeout = 3000
  ): Promise<unknown[]> {
    for (let attempt = 0; ; attempt++) {
      if (!this.bus) throw new Error('D-Bus is not connected')
      try {
        return await this.bus.call({
          destination: SHELL_NAME,
          path: EXT_PATH,
          interface: EXT_IFACE,
          member,
          signature,
          body,
          timeout
        })
      } catch (err) {
        const denied = err instanceof DBusError && err.name.endsWith('.AccessDenied')
        if (!denied || attempt >= ACCESS_RETRIES) throw err
        await new Promise((r) => setTimeout(r, ACCESS_RETRY_MS))
      }
    }
  }

  /** Eklentinin arayüz sürümü; eklenti yüklü ve etkin değilse 0. */
  async version(): Promise<number> {
    try {
      const [v] = await this.call('GetVersion', undefined, undefined, 1500)
      this.extensionVersion = Number(v)
    } catch (err) {
      if (!(err instanceof DBusError)) console.error('Eklenti sürümü sorulamadı:', err)
      this.extensionVersion = 0
    }
    return this.extensionVersion
  }

  get active(): boolean {
    return this.extensionVersion > 0
  }

  /** Çalışan eklentinin arayüz sürümü (0: yok). */
  get apiVersion(): number {
    return this.extensionVersion
  }

  /** Eklenti geçmiş açıkken tuşları yakalayabiliyor (sürüm 2). */
  get canCapture(): boolean {
    return this.extensionVersion >= 2
  }

  async captureKeys(capture: boolean): Promise<void> {
    if (this.canCapture) await this.call('CaptureKeys', 'b', [capture])
  }

  /** Eklenti arama yazımını kendi görünmez giriş kutusunda toplayabiliyor (sürüm 3). */
  get canType(): boolean {
    return this.extensionVersion >= 3
  }

  async startTyping(keycode: number, modifiers: number, horizontal: boolean): Promise<void> {
    if (this.canType) await this.call('StartTyping', 'uub', [keycode, modifiers, horizontal])
  }

  async stopTyping(restoreFocus: boolean): Promise<void> {
    if (this.canType) await this.call('StopTyping', 'b', [restoreFocus])
  }

  /** Eklenti fare tıklamalarını izleyip verilen alanın dışına basılınca `clicked-outside` bildirir (API 5). */
  get canWatchClicks(): boolean {
    return this.extensionVersion >= 5
  }

  /** `inside` dışına yapılan ilk tıklamada `clicked-outside` gelir; `null` izlemeyi bitirir. */
  async watchClicks(inside: Rect | null): Promise<void> {
    if (!this.canWatchClicks) return
    const rect = inside ? [inside.x, inside.y, inside.width, inside.height].map(Math.round) : []
    await this.call('WatchClicks', 'ai', [rect])
  }

  async replayKey(keycode: number, modifiers: number): Promise<void> {
    if (this.canCapture) await this.call('ReplayKey', 'uu', [keycode, modifiers])
  }

  async setShortcut(accelerator: string): Promise<boolean> {
    const [grabbed] = await this.call('SetShortcut', 's', [accelerator])
    return grabbed === true
  }

  async focusInfo(): Promise<FocusInfo> {
    const [info] = await this.call('GetFocusInfo')
    return parseFocusInfo(info)
  }

  async windowInfo(id: number): Promise<FocusInfo | null> {
    const [info] = await this.call('GetWindowInfo', 't', [BigInt(id)])
    const parsed = parseFocusInfo(info)
    return parsed.id !== undefined ? parsed : null
  }

  async focusOwnWindow(title: string): Promise<boolean> {
    const [focused] = await this.call('FocusOwnWindow', 's', [title])
    return focused === true
  }

  /** Hedef pencereyi öne alır ve yapıştırma tuşlarını gönderir; pencere odağa gelmezse false. */
  async paste(windowId: number, keys: PasteKeys): Promise<boolean> {
    const [ok] = await this.call('Paste', 'ts', [BigInt(windowId), keys], 4000)
    return ok === true
  }
}

export const shell = new ShellBridge()
