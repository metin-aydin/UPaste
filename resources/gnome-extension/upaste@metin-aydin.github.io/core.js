// UPaste GNOME Shell eklentisinin çekirdeği (yükleyicisi extension.js). Uygulamanın Wayland'da kendi başına
// yapamadığı işleri yapar:
// - kısayolu (varsayılan Super+V) dinler ve odaklı pencerenin bilgisiyle uygulamaya haber verir,
// - pano sahibi değiştiğinde (her kopyalamada) uygulamaya haber verir,
// - odaklı pencerenin, metin imlecinin (giriş yöntemi üzerinden) ve fare imlecinin ekran konumunu verir,
// - geçmiş açıkken gezinme tuşlarını yakalar: odak hedef uygulamada kalır, imleç yanıp sönmeye devam eder;
//   aramak için yazılanları görünmez bir giriş kutusunda toplayıp uygulamaya iletir (geçmiş penceresi hiç odak almaz,
//   böylece kabuk çubuklarının da üstünde duran odaksız pencere olarak açılabilir),
// - seçilen öğeden sonra hedef pencereye sanal klavyeyle yapıştırma tuşlarını gönderir.
// Yöntemleri yalnız `io.github.metin_aydin.UPaste` adının sahibi (UPaste uygulaması) çağırabilir; sinyaller de
// yalnız ona gönderilir.
import Clutter from 'gi://Clutter'
import Gio from 'gi://Gio'
import GLib from 'gi://GLib'
import Meta from 'gi://Meta'
import Mtk from 'gi://Mtk'
import Shell from 'gi://Shell'
import St from 'gi://St'

import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import { getIBusManager } from 'resource:///org/gnome/shell/misc/ibusManager.js'

const API_VERSION = 5
const APP_BUS_NAME = 'io.github.metin_aydin.UPaste'
const OBJECT_PATH = '/io/github/metin_aydin/UPaste'
const INTERFACE = 'io.github.metin_aydin.UPaste.Shell'
const DEFAULT_SHORTCUT = '<Super>v'
const GRAB_RETRY_SECONDS = 3
const FOCUS_WAIT_MS = 600
const FOCUS_SETTLE_MS = 40
const CARET_WAIT_MS = 120
const CLICK_POLL_MS = 20
const BUTTON_MASK =
  Clutter.ModifierType.BUTTON1_MASK |
  Clutter.ModifierType.BUTTON2_MASK |
  Clutter.ModifierType.BUTTON3_MASK

// Linux giriş (evdev) tuş kodları: klavye düzeninden bağımsızdır, Rusça gibi Latin olmayan düzenlerde de
// uygulamalar aynı fiziksel tuşu yapıştırma kısayolu olarak tanır.
const KEY_LEFTCTRL = 29
const KEY_LEFTSHIFT = 42
const KEY_RIGHTALT = 100
const KEY_V = 47
const KEY_INSERT = 110
const PASTE_KEYS = {
  'shift+insert': [KEY_LEFTSHIFT, KEY_INSERT],
  'ctrl+v': [KEY_LEFTCTRL, KEY_V],
  'ctrl+shift+v': [KEY_LEFTCTRL, KEY_LEFTSHIFT, KEY_V]
}

// Geçmiş açıkken yakalanan gezinme tuşları: hızlandırıcı → uygulamaya iletilen ad.
const NAV_KEYS = [
  ['Up', 'up'],
  ['Down', 'down'],
  ['Left', 'left'],
  ['Right', 'right'],
  ['Page_Up', 'pageup'],
  ['Page_Down', 'pagedown'],
  ['Home', 'home'],
  ['End', 'end'],
  ['Return', 'enter'],
  ['KP_Enter', 'enter'],
  ['<Shift>Return', 'shift+enter'],
  ['<Shift>KP_Enter', 'shift+enter'],
  ['Tab', 'tab'],
  ['<Shift>ISO_Left_Tab', 'shift+tab'],
  ['BackSpace', 'backspace'],
  ['Delete', 'delete'],
  ['<Shift>Delete', 'shift+delete'],
  ['<Control>p', 'ctrl+p']
]
// Yazı tuşlarının X tuş kodları (rakam, harf ve noktalama sıraları, boşluk, ISO'daki ek tuş). Düzenden bağımsız
// olarak tuş koduyla yakalanır: basılınca geçmiş penceresi klavyeyi alır ve tuş oraya yeniden gönderilir; böylece
// arama kutusuna her dilde doğru karakter yazılır ve hiçbir harf hedef uygulamaya kaçmaz.
const TEXT_KEYCODES = [
  ...range(10, 21),
  ...range(24, 35),
  ...range(38, 49),
  ...range(51, 61),
  65,
  94
]
const TEXT_MODIFIERS = [
  ['', 0],
  ['<Shift>', 1],
  ['<Mod5>', 2]
]

function range(from, to) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}

const INTERFACE_XML = `
<node>
  <interface name="${INTERFACE}">
    <method name="GetVersion">
      <arg type="u" direction="out" name="version"/>
    </method>
    <method name="SetShortcut">
      <arg type="s" direction="in" name="accelerator"/>
      <arg type="b" direction="out" name="grabbed"/>
    </method>
    <method name="GetFocusInfo">
      <arg type="a{sv}" direction="out" name="info"/>
    </method>
    <method name="GetWindowInfo">
      <arg type="t" direction="in" name="id"/>
      <arg type="a{sv}" direction="out" name="info"/>
    </method>
    <method name="FocusOwnWindow">
      <arg type="s" direction="in" name="title"/>
      <arg type="b" direction="out" name="focused"/>
    </method>
    <method name="Paste">
      <arg type="t" direction="in" name="window"/>
      <arg type="s" direction="in" name="keys"/>
      <arg type="b" direction="out" name="focused"/>
    </method>
    <method name="CaptureKeys">
      <arg type="b" direction="in" name="capture"/>
    </method>
    <method name="ReplayKey">
      <arg type="u" direction="in" name="keycode"/>
      <arg type="u" direction="in" name="modifiers"/>
    </method>
    <method name="StartTyping">
      <arg type="u" direction="in" name="keycode"/>
      <arg type="u" direction="in" name="modifiers"/>
      <arg type="b" direction="in" name="horizontal"/>
    </method>
    <method name="StopTyping">
      <arg type="b" direction="in" name="restoreFocus"/>
    </method>
    <method name="WatchClicks">
      <arg type="ai" direction="in" name="inside"/>
    </method>
    <signal name="ShortcutPressed">
      <arg type="a{sv}" name="info"/>
    </signal>
    <signal name="ClipboardChanged"/>
    <signal name="ClickedOutside"/>
    <signal name="SearchChanged">
      <arg type="s" name="text"/>
    </signal>
    <signal name="KeyPressed">
      <arg type="s" name="key"/>
      <arg type="u" name="keycode"/>
      <arg type="u" name="modifiers"/>
    </signal>
  </interface>
</node>`

const rectArray = (r) => new GLib.Variant('ai', [r.x, r.y, r.width, r.height].map(Math.round))

export class UPasteCore {
  enable() {
    this._owner = null
    this._ownerPid = 0
    this._shortcut = this._savedShortcut()
    this._action = Meta.KeyBindingAction.NONE
    this._captured = new Map()
    this._timeouts = new Set()

    this._dbus = Gio.DBusExportedObject.wrapJSObject(INTERFACE_XML, this)
    this._dbus.export(Gio.DBus.session, OBJECT_PATH)

    this._watch = Gio.bus_watch_name(
      Gio.BusType.SESSION,
      APP_BUS_NAME,
      Gio.BusNameWatcherFlags.NONE,
      (_conn, _name, owner) => this._setOwner(owner),
      () => this._setOwner(null)
    )

    this._acceleratorId = global.display.connect('accelerator-activated', (_display, action) => {
      if (action === Meta.KeyBindingAction.NONE) return
      if (action === this._action) this._onShortcut()
      else if (this._captured.has(action)) this._onCapturedKey(this._captured.get(action))
    })

    // Metin alanı odağı ve imleç konumu giriş yönteminden okunur: Wayland uygulamaları text-input ile kabuğun
    // giriş yöntemine, X11 uygulamaları IBus'a bildirir. Her ikisi de IBus panel olaylarına düşer.
    this._ime = { focused: false, window: null, caret: null, caretWindow: null, serial: 0 }
    this._ibus = getIBusManager()
    this._ibusIds = [
      this._ibus.connect('focus-in', () => {
        this._ime.focused = true
        this._ime.window = global.display.focus_window
      }),
      this._ibus.connect('focus-out', () => {
        this._ime.focused = false
      }),
      this._ibus.connect('set-cursor-location', (_manager, rect) => {
        this._ime.caret = this._toStage(rect)
        this._ime.caretWindow = global.display.focus_window
        this._ime.serial++
      })
    ]

    this._selection = global.display.get_selection()
    this._ownerChangedId = this._selection.connect('owner-changed', (_sel, type) => {
      if (type === Meta.SelectionType.SELECTION_CLIPBOARD) this._emit('ClipboardChanged', null)
    })

    this._grab()
  }

  disable() {
    this._watchClicks(null)
    this._stopTyping(false)
    this._entry?.destroy()
    this._entry = null
    this._releaseKeys()
    this._ungrab()
    for (const id of this._timeouts) GLib.source_remove(id)
    this._timeouts.clear()
    this._retrying = false
    if (this._acceleratorId) {
      global.display.disconnect(this._acceleratorId)
      this._acceleratorId = 0
    }
    for (const id of this._ibusIds ?? []) this._ibus.disconnect(id)
    this._ibusIds = []
    this._ibus = null
    this._ime = null
    if (this._ownerChangedId) {
      this._selection.disconnect(this._ownerChangedId)
      this._ownerChangedId = 0
    }
    this._selection = null
    if (this._watch) {
      Gio.bus_unwatch_name(this._watch)
      this._watch = 0
    }
    this._dbus?.unexport()
    this._dbus = null
    this._keyboard = null
    this._owner = null
  }

  // --- D-Bus yöntemleri ---

  GetVersionAsync(_params, invocation) {
    invocation.return_value(new GLib.Variant('(u)', [API_VERSION]))
  }

  // Boş kısayol, UPaste'in kısayolu bırakması demektir (önceki bağlama geri yüklendiğinde).
  SetShortcutAsync([accelerator], invocation) {
    if (!this._allowed(invocation)) return
    this._shortcut = accelerator
    this._ungrab()
    const grabbed = this._grab()
    invocation.return_value(new GLib.Variant('(b)', [grabbed]))
  }

  GetFocusInfoAsync(_params, invocation) {
    if (!this._allowed(invocation)) return
    invocation.return_value(new GLib.Variant('(a{sv})', [this._focusInfo()]))
  }

  // Pencerenin bilgisi ve o an klavye odağındaki pencere (`focus*`): uygulama geçmişi ancak odak gerçekten başka bir
  // pencereye geçtiğinde kapatır; odağın kısa süre hiçbir pencerede olmaması bunu tetiklemez.
  GetWindowInfoAsync([id], invocation) {
    if (!this._allowed(invocation)) return
    const win = this._findWindow(id)
    const info = win ? this._windowInfo(win, true) : {}
    const focus = global.display.focus_window
    info.focusId = new GLib.Variant('t', focus?.get_id() ?? 0)
    info.focusPid = new GLib.Variant('i', focus?.get_pid() ?? 0)
    info.focusClass = new GLib.Variant('s', focus?.get_wm_class() ?? '')
    info.focusOwn = new GLib.Variant(
      'b',
      !!focus && this._ownerPid !== 0 && focus.get_pid() === this._ownerPid
    )
    invocation.return_value(new GLib.Variant('(a{sv})', [info]))
  }

  FocusOwnWindowAsync([title], invocation) {
    if (!this._allowed(invocation)) return
    const win = this._windows().find(
      (w) => this._ownerPid !== 0 && w.get_pid() === this._ownerPid && w.get_title() === title
    )
    if (!win) {
      invocation.return_value(new GLib.Variant('(b)', [false]))
      return
    }
    Main.activateWindow(win)
    this._whenFocused(win, (focused) => invocation.return_value(new GLib.Variant('(b)', [focused])))
  }

  PasteAsync([id, keys], invocation) {
    if (!this._allowed(invocation)) return
    this._stopTyping(false)
    this._releaseKeys()
    const codes = PASTE_KEYS[keys]
    const win = this._findWindow(id)
    if (!codes || !win) {
      invocation.return_value(new GLib.Variant('(b)', [false]))
      return
    }
    Main.activateWindow(win)
    this._whenFocused(win, (focused) => {
      if (focused) this._sendKeys(codes)
      invocation.return_value(new GLib.Variant('(b)', [focused]))
    })
  }

  CaptureKeysAsync([capture], invocation) {
    if (!this._allowed(invocation)) return
    if (capture) this._captureKeys()
    else this._releaseKeys()
    invocation.return_value(null)
  }

  // Yakalanan yazı tuşu, geçmiş penceresi klavyeyi aldıktan sonra ona yeniden gönderilir.
  ReplayKeyAsync([keycode, modifiers], invocation) {
    if (!this._allowed(invocation)) return
    const mods = []
    if (modifiers & 1) mods.push(KEY_LEFTSHIFT)
    if (modifiers & 2) mods.push(KEY_RIGHTALT)
    this._sendKeys([...mods, keycode - 8])
    invocation.return_value(null)
  }

  /**
   * Arama yazımı başlar: tuş yakalama bırakılır, klavye görünmez giriş kutusuna geçer. Verilen tuş (yazmayı başlatan
   * harf) kutuya yeniden gönderilir. `horizontal` alt panelde sol/sağ okların kartlar arasında gezinmesi içindir.
   */
  StartTypingAsync([keycode, modifiers, horizontal], invocation) {
    if (!this._allowed(invocation)) return
    this._startTyping(horizontal)
    if (keycode) {
      const mods = []
      if (modifiers & 1) mods.push(KEY_LEFTSHIFT)
      if (modifiers & 2) mods.push(KEY_RIGHTALT)
      this._later(20, () => this._sendKeys([...mods, keycode - 8]))
    }
    invocation.return_value(null)
  }

  StopTypingAsync([restoreFocus], invocation) {
    if (!this._allowed(invocation)) return
    this._stopTyping(restoreFocus)
    invocation.return_value(null)
  }

  // Geçmiş açıkken fare düğmeleri izlenir: verilen dikdörtgenin (kart ya da panel) dışına basılınca uygulamaya
  // bir kez haber verilir. Tıklama yalnız gözlenir, altındaki pencereye olduğu gibi ulaşır. Boş dizi izlemeyi bitirir.
  WatchClicksAsync([inside], invocation) {
    if (!this._allowed(invocation)) return
    this._watchClicks(inside.length === 4 ? inside : null)
    invocation.return_value(null)
  }

  // --- iç işler ---

  _startTyping(horizontal) {
    this._releaseKeys()
    if (!this._entry) {
      // Görünmez ama haritalanmış olmalı: yalnız haritalanmış aktör klavye odağı alır.
      this._entry = new St.Entry({ opacity: 0, x: -100, y: -100, width: 10, height: 10 })
      Main.layoutManager.uiGroup.add_child(this._entry)
    }
    if (this._typing) {
      this._typing.horizontal = horizontal
      return
    }
    const text = this._entry.clutter_text
    text.set_text('')
    this._typing = {
      horizontal,
      window: global.display.focus_window,
      ids: [
        text.connect('text-changed', () =>
          this._emit('SearchChanged', new GLib.Variant('(s)', [text.get_text()]))
        ),
        text.connect('key-press-event', (_actor, event) => this._onTypingKey(event))
      ]
    }
    global.stage.set_key_focus(text)
  }

  _stopTyping(restoreFocus) {
    const typing = this._typing
    if (!typing) return
    this._typing = null
    const text = this._entry.clutter_text
    for (const id of typing.ids) text.disconnect(id)
    if (global.stage.get_key_focus() === text) global.stage.set_key_focus(null)
    text.set_text('')
    const win = typing.window
    if (restoreFocus && win && this._windows().includes(win)) Main.activateWindow(win)
  }

  /** Arama kutusundayken gezinme tuşları uygulamaya iletilir; harfler, silme ve imleç hareketi kutuda kalır. */
  _onTypingKey(event) {
    const sym = event.get_key_symbol()
    const state = event.get_state()
    const shift = (state & Clutter.ModifierType.SHIFT_MASK) !== 0
    const ctrl = (state & Clutter.ModifierType.CONTROL_MASK) !== 0
    const empty = this._entry.clutter_text.get_text() === ''
    const horizontal = this._typing?.horizontal
    let key = null
    if (sym === Clutter.KEY_Up) key = 'up'
    else if (sym === Clutter.KEY_Down) key = 'down'
    else if (sym === Clutter.KEY_Page_Up) key = 'pageup'
    else if (sym === Clutter.KEY_Page_Down) key = 'pagedown'
    else if (sym === Clutter.KEY_Return || sym === Clutter.KEY_KP_Enter)
      key = shift ? 'shift+enter' : 'enter'
    else if (sym === Clutter.KEY_Tab) key = 'tab'
    else if (sym === Clutter.KEY_ISO_Left_Tab) key = 'shift+tab'
    else if (ctrl && (sym === Clutter.KEY_p || sym === Clutter.KEY_P)) key = 'ctrl+p'
    else if (sym === Clutter.KEY_Delete && (shift || empty)) key = shift ? 'shift+delete' : 'delete'
    else if (horizontal && sym === Clutter.KEY_Left) key = 'left'
    else if (horizontal && sym === Clutter.KEY_Right) key = 'right'
    else if (empty && sym === Clutter.KEY_Home) key = 'home'
    else if (empty && sym === Clutter.KEY_End) key = 'end'
    else if (sym === Clutter.KEY_Escape) {
      // Önce arama temizlenir; boşken Esc geçmişi kapatır.
      if (!empty) {
        this._entry.clutter_text.set_text('')
        return Clutter.EVENT_STOP
      }
      key = 'escape'
    }
    if (!key) return Clutter.EVENT_PROPAGATE
    this._emit('KeyPressed', new GLib.Variant('(suu)', [key, 0, 0]))
    return Clutter.EVENT_STOP
  }

  _allowed(invocation) {
    if (this._owner && invocation.get_sender() === this._owner) return true
    invocation.return_dbus_error(
      'org.freedesktop.DBus.Error.AccessDenied',
      `Only ${APP_BUS_NAME} may call this method`
    )
    return false
  }

  _setOwner(owner) {
    this._owner = owner
    this._ownerPid = 0
    if (!owner) {
      // Uygulama kapandıysa yakalanan tuşlar bırakılır; klavye hiçbir durumda kilitli kalmaz.
      this._watchClicks(null)
      this._stopTyping(true)
      this._releaseKeys()
      return
    }
    Gio.DBus.session.call(
      'org.freedesktop.DBus',
      '/org/freedesktop/DBus',
      'org.freedesktop.DBus',
      'GetConnectionUnixProcessID',
      new GLib.Variant('(s)', [owner]),
      new GLib.VariantType('(u)'),
      Gio.DBusCallFlags.NONE,
      -1,
      null,
      (conn, res) => {
        try {
          const [pid] = conn.call_finish(res).deepUnpack()
          if (this._owner === owner) this._ownerPid = pid
        } catch (e) {
          logError(e, 'UPaste: owner pid')
        }
      }
    )
  }

  _emit(name, params) {
    if (!this._owner) return
    try {
      Gio.DBus.session.emit_signal(this._owner, OBJECT_PATH, INTERFACE, name, params)
    } catch (e) {
      logError(e, `UPaste: ${name}`)
    }
  }

  // Uygulamanın en son seçtiği kısayol (UPaste ayar klasöründeki shell.json). Oturum açılışında uygulama henüz
  // çalışmıyor olabilir; kısayol bırakıldıysa eklenti onu başka bir bağlamadan önce almaz.
  _savedShortcut() {
    try {
      const file = GLib.build_filenamev([GLib.get_user_config_dir(), 'UPaste', 'shell.json'])
      const [ok, bytes] = GLib.file_get_contents(file)
      if (ok) {
        const data = JSON.parse(new TextDecoder().decode(bytes))
        if (typeof data.shortcut === 'string') return data.shortcut
      }
    } catch {
      // Dosya yoksa varsayılan kısayol kullanılır.
    }
    return DEFAULT_SHORTCUT
  }

  _grab() {
    if (!this._shortcut) return false
    const action = global.display.grab_accelerator(this._shortcut, Meta.KeyBindingFlags.NONE)
    if (action === Meta.KeyBindingAction.NONE) {
      // Kısayolu başka bir bağlama tutuyor (ör. eski pano yöneticisi); uygulama onu kaldırınca alınır.
      if (!this._retrying) {
        this._retrying = true
        this._later(GRAB_RETRY_SECONDS * 1000, () => {
          this._retrying = false
          if (this._action === Meta.KeyBindingAction.NONE) this._grab()
        })
      }
      return false
    }
    this._action = action
    Main.wm.allowKeybinding(Meta.external_binding_name_for_action(action), Shell.ActionMode.NORMAL)
    return true
  }

  _ungrab() {
    if (this._action === Meta.KeyBindingAction.NONE) return
    global.display.ungrab_accelerator(this._action)
    Main.wm.allowKeybinding(
      Meta.external_binding_name_for_action(this._action),
      Shell.ActionMode.NONE
    )
    this._action = Meta.KeyBindingAction.NONE
  }

  _grabKey(accelerator, entry) {
    const action = global.display.grab_accelerator(accelerator, Meta.KeyBindingFlags.NONE)
    if (action === Meta.KeyBindingAction.NONE) return
    Main.wm.allowKeybinding(Meta.external_binding_name_for_action(action), Shell.ActionMode.NORMAL)
    this._captured.set(action, entry)
  }

  _captureKeys() {
    if (this._captured.size) return
    for (const [accelerator, key] of NAV_KEYS) this._grabKey(accelerator, { key })
    this._grabKey('Escape', { key: 'escape' })
    for (const keycode of TEXT_KEYCODES) {
      for (const [prefix, modifiers] of TEXT_MODIFIERS)
        this._grabKey(`${prefix}0x${keycode.toString(16)}`, { key: 'text', keycode, modifiers })
    }
  }

  _releaseKeys() {
    if (!this._captured?.size) return
    for (const action of this._captured.keys()) {
      global.display.ungrab_accelerator(action)
      Main.wm.allowKeybinding(Meta.external_binding_name_for_action(action), Shell.ActionMode.NONE)
    }
    this._captured.clear()
  }

  _onCapturedKey(entry) {
    // Esc uygulamaya ulaşmasa bile tuşlar bırakılır.
    if (entry.key === 'escape') this._releaseKeys()
    this._emit(
      'KeyPressed',
      new GLib.Variant('(suu)', [entry.key, entry.keycode ?? 0, entry.modifiers ?? 0])
    )
  }

  _onShortcut() {
    if (!this._owner) {
      // Uygulama çalışmıyorsa başlatılır; bir sonraki basışta geçmiş açılır.
      try {
        Gio.DesktopAppInfo.new('upaste.desktop')?.launch([], null)
      } catch (e) {
        logError(e, 'UPaste: launch')
      }
      return
    }
    const win = global.display.focus_window
    this._refreshCaret(win, () =>
      this._emit('ShortcutPressed', new GLib.Variant('(a{sv})', [this._focusInfo()]))
    )
  }

  // IBus, X11 uygulamalarının imleç konumunu yalnız bir tuş işlenirken iletir; bildirilen son konum bu yüzden bir
  // tuş geride kalır. Kısayolda zararsız bir Shift dokunuşu gönderilir ve taze konum kısa bir süre beklenir.
  _refreshCaret(win, done) {
    const x11 = win?.get_client_type() === Meta.WindowClientType.X11
    if (!x11 || !this._ime.focused || this._ime.window !== win) {
      done()
      return
    }
    const serial = this._ime.serial
    const start = GLib.get_monotonic_time()
    this._sendKeys([KEY_LEFTSHIFT])
    const check = () => {
      const waited = (GLib.get_monotonic_time() - start) / 1000
      if (this._ime.serial !== serial || waited > CARET_WAIT_MS) done()
      else this._later(10, check)
    }
    this._later(10, check)
  }

  _watchClicks(rect) {
    this._clickArea = rect ? { x: rect[0], y: rect[1], width: rect[2], height: rect[3] } : null
    if (!this._clickArea) {
      if (this._clickTimer) GLib.source_remove(this._clickTimer)
      this._clickTimer = 0
      return
    }
    if (this._clickTimer) return
    // İzleme başladığında basılı olan düğme (ör. geçmişi açan tıklama) sayılmaz; yalnız yeni basışlar sayılır.
    this._buttonsDown = (global.get_pointer()[2] & BUTTON_MASK) !== 0
    this._clickTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, CLICK_POLL_MS, () => {
      const [x, y, mods] = global.get_pointer()
      const down = (mods & BUTTON_MASK) !== 0
      const pressed = down && !this._buttonsDown
      this._buttonsDown = down
      const a = this._clickArea
      if (!pressed || (x >= a.x && x < a.x + a.width && y >= a.y && y < a.y + a.height))
        return GLib.SOURCE_CONTINUE
      this._clickTimer = 0
      this._clickArea = null
      this._emit('ClickedOutside', null)
      return GLib.SOURCE_REMOVE
    })
  }

  // Pencereler doğrudan mutter'dan listelenir: masaüstü simgeleri (DING) gibi eklentiler `global.get_window_actors()`'ı
  // kendi pencerelerini gizleyecek biçimde değiştirir.
  _windows() {
    return global.display.list_all_windows()
  }

  _findWindow(id) {
    return this._windows().find((w) => w.get_id() === id) ?? null
  }

  _windowInfo(win, withCaret = false) {
    const info = {
      id: new GLib.Variant('t', win.get_id()),
      pid: new GLib.Variant('i', win.get_pid()),
      client: new GLib.Variant(
        's',
        win.get_client_type() === Meta.WindowClientType.X11 ? 'x11' : 'wayland'
      ),
      wmClass: new GLib.Variant('s', win.get_wm_class() ?? ''),
      frame: rectArray(win.get_frame_rect()),
      buffer: rectArray(win.get_buffer_rect()),
      monitor: new GLib.Variant('i', win.get_monitor()),
      focused: new GLib.Variant('b', win.has_focus()),
      own: new GLib.Variant('b', this._ownerPid !== 0 && win.get_pid() === this._ownerPid)
    }
    if (withCaret) {
      const { textInput, caret } = this._textState(win)
      info.textInput = new GLib.Variant('b', textInput)
      if (caret) info.caret = rectArray(caret)
    }
    return info
  }

  _textState(win) {
    const wayland = win.get_client_type() === Meta.WindowClientType.WAYLAND
    const inputMethod = Main.inputMethod
    const focused = win.has_focus()
    const textInput =
      focused &&
      ((wayland && inputMethod?.currentFocus != null) ||
        (this._ime.focused && this._ime.window === win))
    let caret = this._ime.caretWindow === win ? this._ime.caret : null
    if (wayland && focused && inputMethod?.currentFocus && inputMethod._cursorRect)
      caret = inputMethod._cursorRect
    return { textInput, caret: textInput ? caret : null }
  }

  /** Her monitörün ekran dikdörtgeni ve (paneller, rıhtım düşülmüş) çalışma alanı: [x, y, w, h, wx, wy, ww, wh]. */
  _monitors() {
    const workspace = global.workspace_manager.get_active_workspace()
    const list = []
    for (let i = 0; i < global.display.get_n_monitors(); i++) {
      const g = global.display.get_monitor_geometry(i)
      const w = workspace.get_work_area_for_monitor(i)
      list.push([g.x, g.y, g.width, g.height, w.x, w.y, w.width, w.height])
    }
    return new GLib.Variant('aai', list)
  }

  _focusInfo() {
    const [x, y] = global.get_pointer()
    const info = { pointer: new GLib.Variant('ai', [x, y]), monitors: this._monitors() }
    const win = global.display.focus_window
    if (!win) return info
    return Object.assign(info, this._windowInfo(win, true))
  }

  // X11 uygulamalarının bildirdiği konum X koordinatıdır; ölçekli ekranlarda sahne koordinatına çevrilir.
  _toStage(rect) {
    const win = global.display.focus_window
    const plain = { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    if (!win || global.stage.key_focus || typeof win.protocol_to_stage_rect !== 'function')
      return plain
    try {
      const r = win.protocol_to_stage_rect(new Mtk.Rectangle(plain))
      return { x: r.x, y: r.y, width: r.width, height: r.height }
    } catch {
      return plain
    }
  }

  _whenFocused(win, done) {
    const start = GLib.get_monotonic_time()
    const check = () => {
      if (global.display.focus_window === win) {
        this._later(FOCUS_SETTLE_MS, () => done(true))
        return
      }
      if (GLib.get_monotonic_time() - start > FOCUS_WAIT_MS * 1000) {
        done(false)
        return
      }
      this._later(10, check)
    }
    check()
  }

  _sendKeys(codes) {
    this._keyboard ??= Clutter.get_default_backend()
      .get_default_seat()
      .create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE)
    const time = GLib.get_monotonic_time()
    for (const code of codes) this._keyboard.notify_key(time, code, Clutter.KeyState.PRESSED)
    for (const code of [...codes].reverse())
      this._keyboard.notify_key(time, code, Clutter.KeyState.RELEASED)
  }

  _later(ms, fn) {
    const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
      this._timeouts.delete(id)
      fn()
      return GLib.SOURCE_REMOVE
    })
    this._timeouts.add(id)
  }
}
