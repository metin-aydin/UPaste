// Windows API işlevleri (koffi). Yalnız Windows'ta içe aktarılır. Pencere tutamaçları (HWND) tamsayı olarak taşınır.
import koffi from 'koffi'
import {
  ACC_LOCATION,
  GUID,
  GUITHREADINFO,
  HOOKPROC,
  INPUT,
  KBDLLHOOKSTRUCT,
  POINT,
  RECT,
  RELEASE
} from './win32-types'

const user32 = koffi.load('user32.dll')
const dwmapi = koffi.load('dwmapi.dll')
const oleacc = koffi.load('oleacc.dll')
const ole32 = koffi.load('ole32.dll')

export const WH_KEYBOARD_LL = 13
export const WM_KEYDOWN = 0x100
export const WM_KEYUP = 0x101
export const WM_SYSKEYDOWN = 0x104
export const WM_SYSKEYUP = 0x105
export const LLKHF_INJECTED = 0x10
export const VK_SHIFT = 0x10
export const VK_CONTROL = 0x11
export const VK_MENU = 0x12
export const VK_LWIN = 0x5b
export const VK_RWIN = 0x5c
export const VK_V = 0x56
const INPUT_KEYBOARD = 1
const KEYEVENTF_KEYUP = 0x2
const DWMWA_EXTENDED_FRAME_BOUNDS = 9
const OBJID_CARET = 0xfffffff8
const VT_I4 = 3
const CHILDID_SELF = 0
const COINIT_APARTMENTTHREADED = 0x2

const SetWindowsHookExW = user32.func('__stdcall', 'SetWindowsHookExW', 'uintptr_t', [
  'int',
  koffi.pointer(HOOKPROC),
  'uintptr_t',
  'uint32_t'
])
const UnhookWindowsHookEx = user32.func('__stdcall', 'UnhookWindowsHookEx', 'bool', ['uintptr_t'])
const CallNextHookEx = user32.func('__stdcall', 'CallNextHookEx', 'intptr_t', [
  'uintptr_t',
  'int',
  'uintptr_t',
  'void *'
])
const SendInput = user32.func('__stdcall', 'SendInput', 'uint32_t', [
  'uint32_t',
  koffi.pointer(INPUT),
  'int'
])
const GetAsyncKeyState = user32.func('__stdcall', 'GetAsyncKeyState', 'int16_t', ['int'])
const GetForegroundWindow = user32.func('__stdcall', 'GetForegroundWindow', 'uintptr_t', [])
const SetForegroundWindow = user32.func('__stdcall', 'SetForegroundWindow', 'bool', ['uintptr_t'])
const IsWindow = user32.func('__stdcall', 'IsWindow', 'bool', ['uintptr_t'])
const GetWindowThreadProcessId = user32.func('__stdcall', 'GetWindowThreadProcessId', 'uint32_t', [
  'uintptr_t',
  koffi.out(koffi.pointer('uint32_t'))
])
const GetGUIThreadInfo = user32.func('__stdcall', 'GetGUIThreadInfo', 'bool', [
  'uint32_t',
  koffi.inout(koffi.pointer(GUITHREADINFO))
])
const ClientToScreen = user32.func('__stdcall', 'ClientToScreen', 'bool', [
  'uintptr_t',
  koffi.inout(koffi.pointer(POINT))
])
const GetWindowRect = user32.func('__stdcall', 'GetWindowRect', 'bool', [
  'uintptr_t',
  koffi.out(koffi.pointer(RECT))
])
const GetClassNameW = user32.func('__stdcall', 'GetClassNameW', 'int', [
  'uintptr_t',
  'void *',
  'int'
])
const GetClipboardSequenceNumber = user32.func(
  '__stdcall',
  'GetClipboardSequenceNumber',
  'uint32_t',
  []
)
const DwmGetWindowAttribute = dwmapi.func('__stdcall', 'DwmGetWindowAttribute', 'int32_t', [
  'uintptr_t',
  'uint32_t',
  koffi.out(koffi.pointer(RECT)),
  'uint32_t'
])
const AccessibleObjectFromWindow = oleacc.func(
  '__stdcall',
  'AccessibleObjectFromWindow',
  'int32_t',
  ['uintptr_t', 'uint32_t', koffi.pointer(GUID), koffi.out(koffi.pointer('void *'))]
)
const CoInitializeEx = ole32.func('__stdcall', 'CoInitializeEx', 'int32_t', ['void *', 'uint32_t'])

/** IID_IAccessible {618736E0-3C3D-11CF-810C-00AA00389B71}. */
const IID_IACCESSIBLE = {
  Data1: 0x618736e0,
  Data2: 0x3c3d,
  Data3: 0x11cf,
  Data4: [0x81, 0x0c, 0x00, 0xaa, 0x00, 0x38, 0x9b, 0x71]
}
/** IAccessible sanal tablosunda accLocation'ın yeri (IUnknown 3 + IDispatch 4 + IAccessible'ın 16. yöntemi). */
const ACC_LOCATION_SLOT = 22
const RELEASE_SLOT = 2

export interface WinRect {
  x: number
  y: number
  width: number
  height: number
}

export interface KeyEvent {
  vkCode: number
  flags: number
}

const toRect = (r: { left: number; top: number; right: number; bottom: number }): WinRect => ({
  x: r.left,
  y: r.top,
  width: r.right - r.left,
  height: r.bottom - r.top
})

/**
 * Alt düzey klavye kancası kurar. `handle` true dönerse tuş olayı yutulur (diğer uygulamalara ve Windows'a gitmez).
 * Kanca, onu kuran iş parçacığının ileti döngüsünde (Electron ana süreci) çağrılır.
 */
export function installKeyboardHook(
  handle: (down: boolean, event: KeyEvent) => boolean
): () => void {
  let hook = 0
  const callback = koffi.register((code: number, wParam: number, lParam: unknown) => {
    if (code === 0) {
      const event = koffi.decode(lParam, KBDLLHOOKSTRUCT) as KeyEvent
      const down = wParam === WM_KEYDOWN || wParam === WM_SYSKEYDOWN
      const up = wParam === WM_KEYUP || wParam === WM_SYSKEYUP
      if ((down || up) && handle(down, event)) return 1
    }
    return CallNextHookEx(hook, code, wParam, lParam)
  }, koffi.pointer(HOOKPROC))
  hook = Number(SetWindowsHookExW(WH_KEYBOARD_LL, callback, 0, 0))
  if (!hook) {
    koffi.unregister(callback)
    throw new Error('SetWindowsHookExW failed')
  }
  return () => {
    UnhookWindowsHookEx(hook)
    koffi.unregister(callback)
  }
}

/** Tuş şu an basılı mı (fiziksel durum). */
export const keyDown = (vk: number): boolean => (GetAsyncKeyState(vk) & 0x8000) !== 0

/**
 * Sanal tuş olayları gönderir. `extraInfo` UPaste'in kendi gönderdiği olayları kancada tanımak içindir.
 */
export function sendKeys(keys: { vk: number; up: boolean }[], extraInfo: number): boolean {
  const events = keys.map((k) => ({
    type: INPUT_KEYBOARD,
    u: {
      ki: {
        wVk: k.vk,
        wScan: 0,
        dwFlags: k.up ? KEYEVENTF_KEYUP : 0,
        time: 0,
        dwExtraInfo: extraInfo
      }
    }
  }))
  return SendInput(events.length, events, koffi.sizeof(INPUT)) === events.length
}

export const foregroundWindow = (): number => Number(GetForegroundWindow())
export const setForegroundWindow = (hwnd: number): boolean => SetForegroundWindow(hwnd)
export const isWindow = (hwnd: number): boolean => IsWindow(hwnd)
export const clipboardSequence = (): number => GetClipboardSequenceNumber()

/** Pencerenin süreci ve iş parçacığı. */
export function windowProcess(hwnd: number): { pid: number; thread: number } {
  const pid = [0]
  const thread = GetWindowThreadProcessId(hwnd, pid)
  return { pid: pid[0], thread }
}

/** Pencerenin görünen çerçevesi (gölgesiz; fiziksel piksel). */
export function windowFrame(hwnd: number): WinRect | null {
  const rect = { left: 0, top: 0, right: 0, bottom: 0 }
  if (DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, rect, koffi.sizeof(RECT)) === 0)
    return toRect(rect)
  return GetWindowRect(hwnd, rect) ? toRect(rect) : null
}

export function windowClass(hwnd: number): string {
  const buf = Buffer.alloc(512)
  const length = GetClassNameW(hwnd, buf, 256)
  return length > 0 ? buf.toString('utf16le', 0, length * 2) : ''
}

/**
 * Metin imleci (fiziksel piksel). Önce Windows'un sistem imleci (GetGUIThreadInfo: Win32 denetimleri, Not Defteri,
 * Office), yoksa erişilebilirlik arayüzünün imleç nesnesi (OBJID_CARET: Chromium, Electron, Firefox) sorulur.
 * Bulunamazsa null.
 */
export function caretRect(hwnd: number, thread: number): WinRect | null {
  const info = {
    cbSize: koffi.sizeof(GUITHREADINFO),
    flags: 0,
    hwndActive: 0,
    hwndFocus: 0,
    hwndCapture: 0,
    hwndMenuOwner: 0,
    hwndMoveSize: 0,
    hwndCaret: 0,
    rcCaret: { left: 0, top: 0, right: 0, bottom: 0 }
  }
  if (GetGUIThreadInfo(thread, info)) {
    const caretWindow = Number(info.hwndCaret)
    const r = info.rcCaret
    if (caretWindow && r.bottom > r.top) {
      const origin = { x: r.left, y: r.top }
      if (ClientToScreen(caretWindow, origin))
        return {
          x: origin.x,
          y: origin.y,
          width: Math.max(r.right - r.left, 1),
          height: r.bottom - r.top
        }
    }
  }
  const focus = Number(info.hwndFocus) || hwnd
  return accessibleCaret(focus)
}

let comReady = false

function accessibleCaret(hwnd: number): WinRect | null {
  if (!comReady) {
    CoInitializeEx(null, COINIT_APARTMENTTHREADED)
    comReady = true
  }
  const out: unknown[] = [null]
  if (AccessibleObjectFromWindow(hwnd, OBJID_CARET, IID_IACCESSIBLE, out) !== 0 || !out[0])
    return null
  const object = out[0]
  try {
    const table = koffi.decode(object, 'void *')
    const slots = koffi.decode(table, koffi.array('void *', ACC_LOCATION_SLOT + 1)) as unknown[]
    const x = [0]
    const y = [0]
    const w = [0]
    const h = [0]
    const child = {
      vt: VT_I4,
      reserved1: 0,
      reserved2: 0,
      reserved3: 0,
      lVal: CHILDID_SELF,
      padding: 0,
      record: 0
    }
    const hr = koffi.call(slots[ACC_LOCATION_SLOT], ACC_LOCATION, object, x, y, w, h, child)
    if (hr !== 0 || h[0] <= 0) return null
    return { x: x[0], y: y[0], width: Math.max(w[0], 1), height: h[0] }
  } finally {
    const table = koffi.decode(object, 'void *')
    const slots = koffi.decode(table, koffi.array('void *', RELEASE_SLOT + 1)) as unknown[]
    koffi.call(slots[RELEASE_SLOT], RELEASE, object)
  }
}
