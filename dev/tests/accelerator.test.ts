import { acceleratorFromEvent, acceleratorLabel } from '../../src/shared/accelerator'
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

void run('accelerator')
