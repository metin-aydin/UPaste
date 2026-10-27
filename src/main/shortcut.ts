// UPaste'in kısayolu (GTK hızlandırıcı biçiminde); kayıtlı değer yoksa işletim sisteminin varsayılanı.
import { defaultShortcut, type DesktopPlatform } from '@shared/accelerator'
import { store } from './store'

export const platform = process.platform as DesktopPlatform

export const currentShortcut = (): string => store.integration.shortcut || defaultShortcut(platform)
