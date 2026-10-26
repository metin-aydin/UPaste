// Geçmiş penceresi. İki biçimi vardır: metin alanı odaktayken onun hemen altında küçük pencere, değilse (ya da
// ayar öyleyse) ekranın altında yatay kartlı panel. Pencere odak almaz: hedef uygulamadaki imleç yanıp sönmeye
// devam eder, gezinme tuşlarını GNOME eklentisi yakalayıp buraya iletir.
//
// Eklenti arama yazımını kendi görünmez giriş kutusunda toplayabiliyorsa (API 3) pencere odaksız (override-redirect)
// açılır: mutter onu panel ve rıhtım dahil kabuk çubuklarının üstüne koyar, alt panel ekranın tam dibine oturur.
// Daha eski eklentide pencere yönetilen bir araç çubuğu penceresidir ve aramak için klavyeyi kendisi alır.
import { app, BrowserWindow, Notification, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { IPC, type PopupShown } from '@shared/ipc'
import { areaFor, insideFrame, knownCaret, placePopup, type Rect } from '@shared/placement'
import type { PopupFilter, PopupItem, PopupMode } from '@shared/types'
import { history } from './history'
import { watcher } from './clipboard'
import type { CapturedKey, FocusInfo, PasteKeys } from './shell'
import { desktop } from './platform'
import { store } from './store'
import { mt } from './i18n'
import { debug } from './log'

export const POPUP_TITLE = 'UPaste Clipboard History'
/** Görünen kartın pencere kenarına uzaklığı: gölge bu boşlukta çizilir, konumlamada kart metin alanına hizalanır. */
const SHADOW_INSET = 28
/** Küçük pencerenin görünen kartı. */
const CARD = { width: 380, height: 476 }
export const POPUP_SIZE = {
  width: CARD.width + 2 * SHADOW_INSET,
  height: CARD.height + 2 * SHADOW_INSET
}
/** Alt panelin yüksekliği (üstteki gölge payı dahil). */
export const SHEET_HEIGHT = 330
/** Alt panelin üstündeki saydam gölge payı (arayüzde `pt-6`). */
const SHEET_SHADOW = 24
const TRACK_MS = 120
/** Klavyeyi aldıktan hemen sonra gelen odak kaybı yok sayılır (pencere yöneticisi odağı geç verebilir). */
const BLUR_GRACE_MS = 250
const CARET_LINE = 20
const CARD_GAP = 4

interface Target {
  windowId?: number
  frame?: Rect
  /** Küçük pencerenin hizalandığı dikdörtgen (imleç satırı). */
  anchor: Rect
  caret?: Rect
  textInput: boolean
  mode: PopupMode
  /** Konumlamada kullanılan çalışma alanları (mutter'dan, yoksa Electron'dan). */
  areas: Rect[]
}

let win: BrowserWindow | null = null
/** Pencere odaksız (override-redirect) oluşturuldu. */
let overlay = false
let loaded: Promise<void> = Promise.resolve()
let target: Target | null = null
let trackTimer: NodeJS.Timeout | null = null
let shownAt = 0
let showing = false
/** Yönetilen pencere klavye odağında (eski eklentide arama yazılırken). */
let focusMode = false
/** Eklenti gezinme tuşlarını yakalıyor. */
let capturing = false
/** Eklentinin giriş kutusuna arama yazılıyor. */
let typing = false
/** Eklenti kart dışına yapılan tıklamaları izliyor. */
let watchingClicks = false

function createWindow(asOverlay: boolean): void {
  overlay = asOverlay
  const created = new BrowserWindow({
    ...POPUP_SIZE,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    // Odaksız pencere Linux'ta pencere yöneticisinin dışında kalır ve kabuk çubuklarının üstünde çizilir. Yönetilen
    // pencere araç çubuğu türündedir: pencere yöneticisi onu açılışta odaklamaz ve "hazır" bildirimi göstermez;
    // Windows'ta görev çubuğunda ve Alt+Tab'da görünmez. macOS'ta panel türü tam ekran uygulamaların da üstünde açılır.
    ...(asOverlay
      ? { focusable: false }
      : { type: process.platform === 'darwin' ? 'panel' : 'toolbar' }),
    title: POPUP_TITLE,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      spellcheck: false,
      backgroundThrottling: false
    }
  })
  win = created
  created.setAlwaysOnTop(true, 'pop-up-menu')
  created.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  created.on('page-title-updated', (e) => e.preventDefault())
  created.on('blur', () => {
    if (focusMode && Date.now() - shownAt > BLUR_GRACE_MS) hidePopup()
  })
  // Yönetilen pencereye tıklandı: pencere yöneticisi odağı verdi, tuşlar artık doğrudan buraya gelir.
  created.on('focus', () => {
    if (!created.isVisible() || focusMode || overlay) return
    focusMode = true
    shownAt = Date.now()
    if (capturing) {
      capturing = false
      void desktop.captureKeys(false).catch(() => {})
    }
    created.webContents.send(IPC.popupFocus)
  })
  created.on('closed', () => {
    if (win === created) win = null
  })
  loaded = new Promise((resolve) => created.webContents.once('did-finish-load', () => resolve()))
  if (is.dev && process.env['ELECTRON_RENDERER_URL'])
    void created.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/popup.html`)
  else void created.loadFile(join(__dirname, '../renderer/popup.html'))
}

/** Pencereyi eklentinin yeteneğine uygun türde hazırlar (eklenti sürümü değişince yeniden oluşturulur). */
export function ensurePopup(): void {
  const wanted = desktop.canType
  if (win && !win.isDestroyed() && overlay === wanted) return
  if (win && !win.isDestroyed()) {
    hidePopup()
    win.destroy()
  }
  createWindow(wanted)
}

export const createPopup = ensurePopup
export const popupWindow = (): BrowserWindow | null => win
export const popupVisible = (): boolean => !!win && win.isVisible()

const electronAreas = (): Rect[] => screen.getAllDisplays().map((d) => d.workArea)

const caretAnchor = (caret: Rect): Rect => ({
  x: caret.x,
  y: caret.y,
  width: Math.max(caret.width, 1),
  height: caret.height || CARET_LINE
})

/**
 * Küçük pencerenin yerleşeceği dikdörtgen: imleç biliniyorsa onun satırı, değilse fare imleci pencerenin
 * içindeyse onun yeri, o da yoksa pencerenin üst ortası.
 */
export function anchorFor(info: FocusInfo): Rect {
  const frame = info.frame
  const caret = knownCaret(info.caret, frame, info.wmClass)
  if (caret) return caretAnchor(caret)
  const [px, py] = info.pointer
  if (!frame || insideFrame({ x: px, y: py, width: 1, height: 1 }, frame, 0))
    return { x: px, y: py - CARET_LINE / 2, width: 1, height: CARET_LINE }
  return {
    x: frame.x + frame.width / 2 - CARD.width / 2,
    y: frame.y + Math.min(frame.height / 3, 120),
    width: 1,
    height: CARET_LINE
  }
}

/** Kart metin alanının sol kenarına hizalı olsun diye pencere gölge payı kadar sola/yukarı kaydırılır. */
function placeCard(anchor: Rect, areas: Rect[]): { bounds: Rect; above: boolean } {
  const shifted = { ...anchor, x: anchor.x - SHADOW_INSET }
  const p = placePopup(shifted, areas, POPUP_SIZE, CARD_GAP - SHADOW_INSET)
  return { bounds: { x: p.x, y: p.y, width: p.width, height: p.height }, above: p.above }
}

/**
 * Alt panel: odaklı pencerenin (yoksa fare imlecinin) bulunduğu ekranın altında, tam genişlik. Odaksız pencere
 * kabuk çubuklarının üstünde durduğu için ekranın kendi alt kenarına oturur; yönetilen pencere rıhtımın altında
 * kalmasın diye çalışma alanının altına yerleşir.
 */
function sheetBounds(info: FocusInfo): Rect {
  const point = info.frame
    ? { x: info.frame.x + info.frame.width / 2, y: info.frame.y + info.frame.height / 2 }
    : { x: info.pointer[0], y: info.pointer[1] }
  const monitors = info.monitors?.length
    ? info.monitors
    : screen.getAllDisplays().map((d) => ({ bounds: d.bounds, work: d.workArea }))
  const screenRect = areaFor(
    point,
    monitors.map((m) => m.bounds)
  )
  const monitor = monitors.find((m) => m.bounds === screenRect) ?? monitors[0]
  const area = overlay ? monitor.bounds : monitor.work
  const height = Math.min(SHEET_HEIGHT, area.height)
  return { x: area.x, y: area.y + area.height - height, width: area.width, height }
}

/** Kartın (alt panelde panelin) ekrandaki alanı; pencerenin saydam gölge payı dışarıda sayılır. */
function visibleArea(bounds: Rect, mode: PopupMode): Rect {
  if (mode === 'sheet')
    return { ...bounds, y: bounds.y + SHEET_SHADOW, height: bounds.height - SHEET_SHADOW }
  return {
    x: bounds.x + SHADOW_INSET,
    y: bounds.y + SHADOW_INSET,
    width: bounds.width - 2 * SHADOW_INSET,
    height: bounds.height - 2 * SHADOW_INSET
  }
}

/** Görünen alanın dışına yapılan tıklama eklentiden `clicked-outside` olarak gelir; `null` izlemeyi bitirir. */
function watchOutsideClicks(bounds: Rect | null, mode: PopupMode = 'popup'): void {
  if (!desktop.canWatchClicks) return
  watchingClicks = bounds !== null
  void desktop.watchClicks(bounds && visibleArea(bounds, mode)).catch(() => {})
}

/**
 * Odak hedeften başka bir pencereye geçti mi? Odağın hiçbir pencerede olmaması, UPaste'in kendi penceresi ve hedefle
 * aynı süreçteki pencereler (ör. masaüstü simgelerinin her monitördeki penceresi) sayılmaz. Odaktaki pencereyi
 * bildirmeyen eski eklentide hedefin odağı kaybetmesi yeterlidir.
 */
function focusMovedAway(info: FocusInfo): boolean {
  const focus = info.focus
  if (!focus) return true
  return focus.id !== 0 && !focus.own && focus.pid !== info.pid
}

const sameRect = (a?: Rect, b?: Rect): boolean =>
  !!a && !!b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height

/** Kısayol geldi: geçmişi açar; açıksa kapatır. */
export async function togglePopup(info: FocusInfo | null): Promise<void> {
  if (showing) return
  if (win?.isVisible()) {
    hidePopup(true)
    return
  }
  if (info?.own) return
  ensurePopup()
  if (!win) return
  showing = true
  try {
    await loaded
    const pointer = screen.getCursorScreenPoint()
    const focus: FocusInfo = info ?? { pointer: [pointer.x, pointer.y] }
    const textInput = focus.textInput === true
    // Küçük pencere yalnız imlecin yeri biliniyorsa açılır; aksi hâlde (metin alanı yok ya da uygulama imleci
    // bildirmiyor) ekranın altındaki panel açılır.
    const caretKnown = knownCaret(focus.caret, focus.frame, focus.wmClass) !== null
    const mode: PopupMode =
      store.settings.layout === 'sheet' || !textInput || !caretKnown ? 'sheet' : 'popup'
    const anchor = anchorFor(focus)
    const areas = focus.monitors?.length ? focus.monitors.map((m) => m.work) : electronAreas()
    target = {
      windowId: focus.id,
      frame: focus.frame,
      anchor,
      caret: focus.caret,
      textInput,
      mode,
      areas
    }
    const placed =
      mode === 'popup' ? placeCard(anchor, areas) : { bounds: sheetBounds(focus), above: false }
    // Odakta pencere olmasa da (masaüstü) tuşlar yakalanır; yapıştırılacak pencere yoksa öğe yalnız panoya yazılır.
    const capture = desktop.canCapture && info !== null
    focusMode = !capture && !overlay
    typing = false
    debug(
      'popup',
      mode,
      JSON.stringify(placed.bounds),
      overlay ? 'overlay' : capture ? 'capture' : 'focus'
    )

    win.setBounds(placed.bounds)
    const payload: PopupShown & { items: PopupItem[]; filter: PopupFilter } = {
      mode,
      above: placed.above,
      focused: focusMode,
      overlay,
      items: history.list('', 'all'),
      filter: 'all'
    }
    win.webContents.send(IPC.popupShown, payload)
    // Arayüz yeni listeyi çizsin, eski içerik bir an görünmesin.
    await new Promise((r) => setTimeout(r, 16))
    shownAt = Date.now()
    if (capture || overlay) {
      win.showInactive()
      if (capture) {
        capturing = true
        await desktop.captureKeys(true).catch((err) => console.error('Tuşlar yakalanamadı:', err))
      }
      watchOutsideClicks(placed.bounds, mode)
    } else {
      // macOS'ta menü çubuğu uygulaması klavyeyi ancak etkinleşince alır; yapıştırırken hedef uygulama yeniden öne
      // alınır.
      if (process.platform === 'darwin') app.focus({ steal: true })
      win.show()
      win.focus()
      if (desktop.active) await desktop.focusOwnWindow(POPUP_TITLE).catch(() => false)
    }
    startTracking()
  } finally {
    showing = false
  }
}

/**
 * Arama yazımı başlar (kullanıcı yazmaya başladı ya da arama kutusuna tıkladı). Odaksız pencerede yazılanlar
 * eklentinin giriş kutusunda toplanır; yönetilen pencerede pencere klavyeyi alır. Yazmayı başlatan tuş verildiyse
 * yeniden gönderilir, böylece arama kutusu doğru karakteri alır.
 */
export async function startSearch(replay?: { keycode: number; modifiers: number }): Promise<void> {
  if (!win?.isVisible()) return
  if (overlay) {
    if (typing) return
    typing = true
    capturing = false
    win.webContents.send(IPC.popupTyping, true)
    await desktop
      .startTyping(replay?.keycode ?? 0, replay?.modifiers ?? 0, target?.mode === 'sheet')
      .catch((err) => console.error('Arama başlatılamadı:', err))
    return
  }
  await enterFocusMode(replay)
}

async function enterFocusMode(replay?: { keycode: number; modifiers: number }): Promise<void> {
  if (!win?.isVisible() || focusMode) return
  focusMode = true
  if (capturing) {
    capturing = false
    await desktop.captureKeys(false).catch(() => {})
  }
  shownAt = Date.now()
  win.focus()
  if (desktop.active) await desktop.focusOwnWindow(POPUP_TITLE).catch(() => false)
  win.webContents.send(IPC.popupFocus)
  if (replay) {
    await new Promise((r) => setTimeout(r, 30))
    await desktop.replayKey(replay.keycode, replay.modifiers).catch(() => {})
  }
}

/** Eklentinin yakaladığı tuş: gezinme tuşları arayüze iletilir, yazı tuşu aramayı başlatır. */
export function handleCapturedKey(key: CapturedKey): void {
  if (!win?.isVisible() || focusMode) return
  if (key.key === 'escape') {
    // Eklenti tuşları zaten bıraktı.
    capturing = false
    hidePopup(true)
    return
  }
  if (key.key === 'text') {
    void startSearch({ keycode: key.keycode, modifiers: key.modifiers })
    return
  }
  win.webContents.send(IPC.popupKey, key.key)
}

/** Eklentinin giriş kutusundaki arama metni değişti. */
export function handleSearchText(text: string): void {
  if (win?.isVisible() && typing) win.webContents.send(IPC.popupQuery, text)
}

/** Pencereyi kapatır; `restoreFocus` ise arama sırasında odağı alan giriş kutusundan hedef pencereye dönülür. */
export function hidePopup(restoreFocus = true): void {
  stopTracking()
  if (watchingClicks) watchOutsideClicks(null)
  if (capturing) {
    capturing = false
    void desktop.captureKeys(false).catch(() => {})
  }
  if (typing) {
    typing = false
    void desktop.stopTyping(restoreFocus).catch(() => {})
  }
  focusMode = false
  if (win?.isVisible()) win.hide()
}

/**
 * Hedef izlenir: pencere kapanır ya da kullanıcı başka pencereye geçerse geçmiş kapanır; imleç (uygulama
 * bildirdikçe) ya da pencere yer değiştirirse küçük pencere de onunla birlikte kayar.
 */
function startTracking(): void {
  stopTracking()
  const t = target
  if (t?.windowId === undefined || !desktop.active) return
  let busy = false
  trackTimer = setInterval(async () => {
    if (busy || !win?.isVisible()) return
    busy = true
    try {
      const info = await desktop.windowInfo(t.windowId!)
      if (!info?.frame) {
        debug('hide', 'target window gone')
        hidePopup(false)
        return
      }
      if (
        !focusMode &&
        !typing &&
        info.focused === false &&
        !win.isFocused() &&
        focusMovedAway(info)
      ) {
        debug('hide', 'focus moved to another window', JSON.stringify(info.focus ?? null))
        hidePopup(false)
        return
      }
      if (t.mode === 'sheet') return
      let anchor = t.anchor
      const caret = knownCaret(info.caret, info.frame, info.wmClass)
      if (caret && !sameRect(caret, t.caret)) {
        t.caret = caret
        anchor = caretAnchor(caret)
      } else if (t.frame && (info.frame.x !== t.frame.x || info.frame.y !== t.frame.y)) {
        const dx = info.frame.x - t.frame.x
        const dy = info.frame.y - t.frame.y
        anchor = { ...anchor, x: anchor.x + dx, y: anchor.y + dy }
        if (t.caret) t.caret = { ...t.caret, x: t.caret.x + dx, y: t.caret.y + dy }
      }
      t.frame = info.frame
      if (!sameRect(anchor, t.anchor)) {
        t.anchor = anchor
        const bounds = placeCard(anchor, t.areas).bounds
        win.setBounds(bounds)
        if (watchingClicks) watchOutsideClicks(bounds)
      }
    } catch {
      // Kabuk geçici olarak yanıt vermediyse bir sonraki turda yeniden denenir.
    } finally {
      busy = false
    }
  }, TRACK_MS)
}

function stopTracking(): void {
  if (trackTimer) clearInterval(trackTimer)
  trackTimer = null
}

/**
 * Seçilen öğe panoya yazılır, pencere kapanır ve hedef pencereye yapıştırılır. Metin alanında Shift+Insert
 * (terminaller dahil her yerde yapıştırır), metin alanı olmayan uygulamada (ör. resim düzenleyici) Ctrl+V kullanılır.
 */
export async function pasteItem(id: string, plain: boolean): Promise<boolean> {
  const item = history.get(id)
  if (!item) return false
  await watcher.write(item, plain, (i) => history.imagePath(i))
  history.touch(id)
  const t = target
  hidePopup(false)
  if (t?.windowId !== undefined && desktop.active) {
    const keys: PasteKeys = t.textInput ? 'shift+insert' : 'ctrl+v'
    try {
      if (await desktop.paste(t.windowId, keys)) return true
    } catch (err) {
      console.error('Yapıştırılamadı:', err)
    }
  }
  if (Notification.isSupported() && process.env['UPASTE_TEST'] !== '1') {
    new Notification({
      title: mt('notify.copiedTitle'),
      body: mt('notify.copiedBody', { paste: process.platform === 'darwin' ? '⌘V' : 'Ctrl+V' }),
      silent: true
    }).show()
  }
  return false
}

app.on('before-quit', stopTracking)
