import {
  acceleratorFromEvent,
  acceleratorLabel,
  defaultShortcut,
  electronAccelerator,
  windowsVirtualKey
} from '../../src/shared/accelerator'
import { eq, run, test } from './harness'

const ev = (
  code: string,
  mods: Partial<Record<'ctrl' | 'alt' | 'shift' | 'meta', boolean>> = {}
) => ({
  key: '',
  code,
  ctrlKey: !!mods.ctrl,
  altKey: !!mods.alt,
  shiftKey: !!mods.shift,
  metaKey: !!mods.meta
})

test('Super+V', () => eq(acceleratorFromEvent(ev('KeyV', { meta: true })), '<Super>v'))
test('Ctrl+Shift+V', () =>
  eq(acceleratorFromEvent(ev('KeyV', { ctrl: true, shift: true })), '<Control><Shift>v'))
test('değiştiricisiz geçersiz', () => eq(acceleratorFromEvent(ev('KeyV')), null))
test('yalnız Shift geçersiz', () => eq(acceleratorFromEvent(ev('KeyV', { shift: true })), null))
test('F tuşu ve rakam', () => {
  eq(acceleratorFromEvent(ev('F9', { alt: true })), '<Alt>F9')
  eq(acceleratorFromEvent(ev('Digit3', { ctrl: true, alt: true })), '<Control><Alt>3')
})
test('okunur etiket', () => {
  eq(acceleratorLabel('<Super>v'), 'Super+V')
  eq(acceleratorLabel('<Shift><Control>v'), 'Ctrl+Shift+V')
})

test('işletim sistemine göre etiket', () => {
  eq(acceleratorLabel('<Super>v', 'win32'), 'Win+V')
  eq(acceleratorLabel('<Super><Shift>v', 'darwin'), '⇧⌘V')
  eq(acceleratorLabel('<Control><Alt>v', 'darwin'), '⌃⌥V')
})
test('varsayılan kısayol', () => {
  eq(defaultShortcut('linux'), '<Super>v')
  eq(defaultShortcut('win32'), '<Super>v')
  eq(defaultShortcut('darwin'), '<Super><Shift>v')
})
test('Electron hızlandırıcısı', () => {
  eq(electronAccelerator('<Super><Shift>v'), 'Super+Shift+V')
  eq(electronAccelerator('<Shift><Control>Page_Up'), 'Control+Shift+PageUp')
  eq(electronAccelerator('<Alt>F9'), 'Alt+F9')
  eq(electronAccelerator('v'), null)
})
test('Windows sanal tuş kodu', () => {
  eq(windowsVirtualKey('v'), 0x56)
  eq(windowsVirtualKey('3'), 0x33)
  eq(windowsVirtualKey('F1'), 0x70)
  eq(windowsVirtualKey('F12'), 0x7b)
  eq(windowsVirtualKey('Insert'), 0x2d)
  eq(windowsVirtualKey('bilinmeyen'), null)
})

void run('accelerator')
