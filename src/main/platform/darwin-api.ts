// macOS API işlevleri (koffi): Erişilebilirlik (AX) ile odaktaki uygulama, pencere ve metin imleci; Core Graphics ile
// sanal tuş olayı; Objective-C çalışma zamanı ile pano sayacı ve uygulama etkinleştirme. Yalnız macOS'ta içe aktarılır.
// Core Foundation nesneleri kullanıldıktan sonra CFRelease ile bırakılır.
import koffi from 'koffi'
import { CFRange, CGPoint, CGRect, CGSize } from './darwin-types'

const cf = koffi.load('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation')
const services = koffi.load(
  '/System/Library/Frameworks/ApplicationServices.framework/ApplicationServices'
)
const graphics = koffi.load('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')
const objc = koffi.load('/usr/lib/libobjc.A.dylib')

const kCFStringEncodingUTF8 = 0x08000100
const kAXErrorSuccess = 0
const kAXValueCGPointType = 1
const kAXValueCGSizeType = 2
const kAXValueCGRectType = 3
const kAXValueCFRangeType = 4
const kCGHIDEventTap = 0
const kCGEventFlagMaskCommand = 0x100000
const kVK_ANSI_V = 9
const NSApplicationActivateIgnoringOtherApps = 1 << 1

const CFStringCreateWithCString = cf.func('CFStringCreateWithCString', 'void *', [
  'void *',
  'str',
  'uint32_t'
])
const CFRelease = cf.func('CFRelease', 'void', ['void *'])
const CFGetTypeID = cf.func('CFGetTypeID', 'uint64_t', ['void *'])
const CFStringGetTypeID = cf.func('CFStringGetTypeID', 'uint64_t', [])
const CFStringGetCString = cf.func('CFStringGetCString', 'bool', [
  'void *',
  'void *',
  'int64_t',
  'uint32_t'
])
const kCFBooleanTrue = koffi.decode(cf.symbol('kCFBooleanTrue'), 'void *')

const AXIsProcessTrusted = services.func('AXIsProcessTrusted', 'bool', [])
const AXUIElementCreateSystemWide = services.func('AXUIElementCreateSystemWide', 'void *', [])
const AXUIElementCreateApplication = services.func('AXUIElementCreateApplication', 'void *', [
  'int32_t'
])
const AXUIElementCopyAttributeValue = services.func('AXUIElementCopyAttributeValue', 'int32_t', [
  'void *',
  'void *',
  koffi.out(koffi.pointer('void *'))
])
const AXUIElementCopyParameterizedAttributeValue = services.func(
  'AXUIElementCopyParameterizedAttributeValue',
  'int32_t',
  ['void *', 'void *', 'void *', koffi.out(koffi.pointer('void *'))]
)
const AXUIElementSetAttributeValue = services.func('AXUIElementSetAttributeValue', 'int32_t', [
  'void *',
  'void *',
  'void *'
])
const AXUIElementGetPid = services.func('AXUIElementGetPid', 'int32_t', [
  'void *',
  koffi.out(koffi.pointer('int32_t'))
])
const AXValueGetPoint = services.func('AXValueGetValue', 'bool', [
  'void *',
  'uint32_t',
  koffi.out(koffi.pointer(CGPoint))
])
const AXValueGetSize = services.func('AXValueGetValue', 'bool', [
  'void *',
  'uint32_t',
  koffi.out(koffi.pointer(CGSize))
])
const AXValueGetRect = services.func('AXValueGetValue', 'bool', [
  'void *',
  'uint32_t',
  koffi.out(koffi.pointer(CGRect))
])
const AXValueGetRange = services.func('AXValueGetValue', 'bool', [
  'void *',
  'uint32_t',
  koffi.out(koffi.pointer(CFRange))
])
const AXValueCreateRange = services.func('AXValueCreate', 'void *', [
  'uint32_t',
  koffi.pointer(CFRange)
])
const CGEventCreateKeyboardEvent = graphics.func('CGEventCreateKeyboardEvent', 'void *', [
  'void *',
  'uint16_t',
  'bool'
])
const CGEventSetFlags = graphics.func('CGEventSetFlags', 'void', ['void *', 'uint64_t'])
const CGEventPost = graphics.func('CGEventPost', 'void', ['uint32_t', 'void *'])

const objc_getClass = objc.func('objc_getClass', 'void *', ['str'])
const sel_registerName = objc.func('sel_registerName', 'void *', ['str'])
const sendId = objc.func('objc_msgSend', 'void *', ['void *', 'void *'])
const sendLong = objc.func('objc_msgSend', 'int64_t', ['void *', 'void *'])
const sendIdInt = objc.func('objc_msgSend', 'void *', ['void *', 'void *', 'int32_t'])
const sendBoolUlong = objc.func('objc_msgSend', 'bool', ['void *', 'void *', 'uint64_t'])

const strings = new Map<string, unknown>()
/** Öznitelik adının kalıcı CFString'i (bir kez oluşturulur). */
function attr(name: string): unknown {
  let s = strings.get(name)
  if (!s) {
    s = CFStringCreateWithCString(null, name, kCFStringEncodingUTF8)
    strings.set(name, s)
  }
  return s
}

export interface MacRect {
  x: number
  y: number
  width: number
  height: number
}

/** Elemanın özniteliği (sahibi çağırandır: CFRelease gerekir); yoksa null. */
function copy(element: unknown, name: string): unknown {
  const out: unknown[] = [null]
  if (AXUIElementCopyAttributeValue(element, attr(name), out) !== kAXErrorSuccess) return null
  return out[0] ?? null
}

function release(...refs: unknown[]): void {
  for (const r of refs) if (r) CFRelease(r)
}

function text(ref: unknown): string | null {
  if (!ref || CFGetTypeID(ref) !== CFStringGetTypeID()) return null
  const buf = Buffer.alloc(256)
  return CFStringGetCString(ref, buf, buf.length, kCFStringEncodingUTF8)
    ? buf.toString('utf8', 0, buf.indexOf(0))
    : null
}

export const accessibilityTrusted = (): boolean => AXIsProcessTrusted()

/** Pano değişim sayacı: [[NSPasteboard generalPasteboard] changeCount]. */
export function pasteboardChangeCount(): number {
  const board = sendId(objc_getClass('NSPasteboard'), sel_registerName('generalPasteboard'))
  return Number(sendLong(board, sel_registerName('changeCount')))
}

/** Süreci öne alır (NSRunningApplication activateWithOptions:). */
export function activateProcess(pid: number): boolean {
  const app = sendIdInt(
    objc_getClass('NSRunningApplication'),
    sel_registerName('runningApplicationWithProcessIdentifier:'),
    pid
  )
  if (!app) return false
  return sendBoolUlong(
    app,
    sel_registerName('activateWithOptions:'),
    NSApplicationActivateIgnoringOtherApps
  )
}

/** ⌘V gönderir (Erişilebilirlik izni gerekir). */
export function sendPaste(): void {
  for (const down of [true, false]) {
    const event = CGEventCreateKeyboardEvent(null, kVK_ANSI_V, down)
    CGEventSetFlags(event, kCGEventFlagMaskCommand)
    CGEventPost(kCGHIDEventTap, event)
    CFRelease(event)
  }
}

const electronApps = new Set<number>()

/**
 * Chromium tabanlı uygulamalar (Electron, Chrome) erişilebilirlik ağacını ancak istenince kurar: bir kez
 * AXManualAccessibility açılır; ağaç sonraki sorgularda hazırdır.
 */
function enableAccessibility(pid: number): void {
  if (electronApps.has(pid)) return
  electronApps.add(pid)
  const app = AXUIElementCreateApplication(pid)
  AXUIElementSetAttributeValue(app, attr('AXManualAccessibility'), kCFBooleanTrue)
  release(app)
}

function rangeBounds(
  element: unknown,
  range: { location: number; length: number }
): MacRect | null {
  const value = AXValueCreateRange(kAXValueCFRangeType, range)
  if (!value) return null
  const out: unknown[] = [null]
  const ok =
    AXUIElementCopyParameterizedAttributeValue(element, attr('AXBoundsForRange'), value, out) ===
    kAXErrorSuccess
  release(value)
  if (!ok || !out[0]) return null
  const rect = { origin: { x: 0, y: 0 }, size: { width: 0, height: 0 } }
  const got = AXValueGetRect(out[0], kAXValueCGRectType, rect)
  release(out[0])
  if (!got || rect.size.height <= 0) return null
  return { x: rect.origin.x, y: rect.origin.y, width: rect.size.width, height: rect.size.height }
}

export interface MacFocus {
  pid: number
  role: string | null
  frame: MacRect | null
  /** Odaktaki eleman metin seçimini destekliyor (metin alanı). */
  textInput: boolean
  caret: MacRect | null
}

/** Odaktaki uygulama, penceresi ve metin imleci (ekran noktası; sol üst köşe başlangıç). */
export function focusedElement(): MacFocus | null {
  const system = AXUIElementCreateSystemWide()
  const app = copy(system, 'AXFocusedApplication')
  release(system)
  if (!app) return null
  const pid = [0]
  AXUIElementGetPid(app, pid)
  enableAccessibility(pid[0])
  const result: MacFocus = { pid: pid[0], role: null, frame: null, textInput: false, caret: null }
  const window = copy(app, 'AXFocusedWindow')
  if (window) {
    const position = copy(window, 'AXPosition')
    const size = copy(window, 'AXSize')
    const p = { x: 0, y: 0 }
    const s = { width: 0, height: 0 }
    if (
      position &&
      size &&
      AXValueGetPoint(position, kAXValueCGPointType, p) &&
      AXValueGetSize(size, kAXValueCGSizeType, s)
    )
      result.frame = { x: p.x, y: p.y, width: s.width, height: s.height }
    release(position, size, window)
  }
  const element = copy(app, 'AXFocusedUIElement')
  release(app)
  if (!element) return result
  const role = copy(element, 'AXRole')
  result.role = text(role)
  release(role)
  const selected = copy(element, 'AXSelectedTextRange')
  if (selected) {
    const range = { location: 0, length: 0 }
    if (AXValueGetRange(selected, kAXValueCFRangeType, range)) {
      result.textInput = true
      const location = Number(range.location)
      const length = Number(range.length)
      // Boş seçimde çoğu uygulama imlecin dikdörtgenini verir; vermeyenlerde önceki karakterin sağ kenarı kullanılır.
      result.caret = rangeBounds(element, { location: location + length, length: 0 })
      if (!result.caret && location + length > 0) {
        const previous = rangeBounds(element, { location: location + length - 1, length: 1 })
        if (previous)
          result.caret = {
            x: previous.x + previous.width,
            y: previous.y,
            width: 1,
            height: previous.height
          }
      }
    }
    release(selected)
  }
  release(element)
  return result
}
