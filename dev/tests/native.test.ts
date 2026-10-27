// Windows ve macOS yerel API bağlamaları. Yapı boyutları 64 bit Windows/macOS düzenine göre her platformda denetlenir;
// API'nin kendisi (kütüphaneleri yükleme ve zararsız çağrılar) yalnız kendi işletim sisteminde çalıştırılır.
import koffi from 'koffi'
import {
  GUID,
  GUITHREADINFO,
  INPUT,
  KBDLLHOOKSTRUCT,
  POINT,
  RECT,
  VARIANT
} from '../../src/main/platform/win32-types'
import { CFRange, CGPoint, CGRect, CGSize } from '../../src/main/platform/darwin-types'
import { eq, ok, run, test } from './harness'

test('Windows yapı boyutları (64 bit)', () => {
  eq(koffi.sizeof(RECT), 16)
  eq(koffi.sizeof(POINT), 8)
  eq(koffi.sizeof(GUITHREADINFO), 72)
  eq(koffi.sizeof(KBDLLHOOKSTRUCT), 24)
  eq(koffi.sizeof(INPUT), 40)
  eq(koffi.offsetof(INPUT, 'u'), 8)
  eq(koffi.sizeof(GUID), 16)
  eq(koffi.sizeof(VARIANT), 24)
})

test('macOS yapı boyutları', () => {
  eq(koffi.sizeof(CGPoint), 16)
  eq(koffi.sizeof(CGSize), 16)
  eq(koffi.sizeof(CGRect), 32)
  eq(koffi.sizeof(CFRange), 16)
})

if (process.platform === 'win32') {
  test('Windows API yüklenir ve zararsız çağrılar çalışır', async () => {
    const api = await import('../../src/main/platform/win32-api')
    ok(typeof api.clipboardSequence() === 'number')
    ok(typeof api.keyDown(api.VK_SHIFT) === 'boolean')
    const hwnd = api.foregroundWindow()
    if (hwnd) {
      const { pid, thread } = api.windowProcess(hwnd)
      ok(pid > 0 && thread > 0, `pid ${pid}, thread ${thread}`)
      ok(api.isWindow(hwnd))
      api.windowFrame(hwnd)
      api.windowClass(hwnd)
      api.caretRect(hwnd, thread)
    }
    // Kanca kurulup hemen bırakılır (tuş olayı gönderilmez).
    const unhook = api.installKeyboardHook(() => false)
    unhook()
  })
}

if (process.platform === 'darwin') {
  test('macOS API yüklenir ve zararsız çağrılar çalışır', async () => {
    const api = await import('../../src/main/platform/darwin-api')
    ok(typeof api.pasteboardChangeCount() === 'number')
    ok(typeof api.accessibilityTrusted() === 'boolean')
    // İzin yokken (CI) odak bilgisi null ya da yalnız süreç bilgisini döndürür; çökmemeli.
    api.focusedElement()
  })
}

void run('native')
