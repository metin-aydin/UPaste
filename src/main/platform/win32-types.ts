// Windows API yapıları (koffi). Yalnız tür tanımıdır, kütüphane yüklemez; boyutları 64 bit Windows ile aynıdır ve
// birim testinde denetlenir.
import koffi from 'koffi'

export const RECT = koffi.struct('UPASTE_RECT', {
  left: 'int32_t',
  top: 'int32_t',
  right: 'int32_t',
  bottom: 'int32_t'
})

export const POINT = koffi.struct('UPASTE_POINT', { x: 'int32_t', y: 'int32_t' })

/** GetGUIThreadInfo çıktısı: odaktaki pencere ve sistem imlecinin (caret) istemci koordinatı. */
export const GUITHREADINFO = koffi.struct('UPASTE_GUITHREADINFO', {
  cbSize: 'uint32_t',
  flags: 'uint32_t',
  hwndActive: 'uintptr_t',
  hwndFocus: 'uintptr_t',
  hwndCapture: 'uintptr_t',
  hwndMenuOwner: 'uintptr_t',
  hwndMoveSize: 'uintptr_t',
  hwndCaret: 'uintptr_t',
  rcCaret: RECT
})

/** Alt düzey klavye kancasının (WH_KEYBOARD_LL) her tuş olayında aldığı yapı. */
export const KBDLLHOOKSTRUCT = koffi.struct('UPASTE_KBDLLHOOKSTRUCT', {
  vkCode: 'uint32_t',
  scanCode: 'uint32_t',
  flags: 'uint32_t',
  time: 'uint32_t',
  dwExtraInfo: 'uintptr_t'
})

const KEYBDINPUT = koffi.struct('UPASTE_KEYBDINPUT', {
  wVk: 'uint16_t',
  wScan: 'uint16_t',
  dwFlags: 'uint32_t',
  time: 'uint32_t',
  dwExtraInfo: 'uintptr_t'
})

const MOUSEINPUT = koffi.struct('UPASTE_MOUSEINPUT', {
  dx: 'int32_t',
  dy: 'int32_t',
  mouseData: 'uint32_t',
  dwFlags: 'uint32_t',
  time: 'uint32_t',
  dwExtraInfo: 'uintptr_t'
})

/** SendInput girdisi; birleşimin boyutu en büyük üyesi olan fare girdisi kadardır. */
export const INPUT = koffi.struct('UPASTE_INPUT', {
  type: 'uint32_t',
  u: koffi.union({ mi: MOUSEINPUT, ki: KEYBDINPUT })
})

export const GUID = koffi.struct('UPASTE_GUID', {
  Data1: 'uint32_t',
  Data2: 'uint16_t',
  Data3: 'uint16_t',
  Data4: koffi.array('uint8_t', 8)
})

/** COM VARIANT (64 bit): tür etiketi, üç ayrılmış alan ve 16 baytlık değer. Yalnız VT_I4 kullanılır. */
export const VARIANT = koffi.struct('UPASTE_VARIANT', {
  vt: 'uint16_t',
  reserved1: 'uint16_t',
  reserved2: 'uint16_t',
  reserved3: 'uint16_t',
  lVal: 'int32_t',
  padding: 'uint32_t',
  record: 'uint64_t'
})

/** LRESULT CALLBACK LowLevelKeyboardProc(int nCode, WPARAM wParam, LPARAM lParam → KBDLLHOOKSTRUCT). */
export const HOOKPROC = koffi.proto('__stdcall', 'UPASTE_HOOKPROC', 'intptr_t', [
  'int',
  'uintptr_t',
  'void *'
])

/** IAccessible::accLocation(this, long *x, long *y, long *w, long *h, VARIANT child). */
export const ACC_LOCATION = koffi.proto('__stdcall', 'UPASTE_ACC_LOCATION', 'int32_t', [
  'void *',
  koffi.out(koffi.pointer('int32_t')),
  koffi.out(koffi.pointer('int32_t')),
  koffi.out(koffi.pointer('int32_t')),
  koffi.out(koffi.pointer('int32_t')),
  VARIANT
])

/** IUnknown::Release(this). */
export const RELEASE = koffi.proto('__stdcall', 'UPASTE_RELEASE', 'uint32_t', ['void *'])
