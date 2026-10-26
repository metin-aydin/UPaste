// İşletim sistemine göre masaüstü katmanı: Windows ve macOS'ta yerel köprü hem geçmiş penceresinin köprüsü hem
// Kurulum bölümünün bütünleşmesidir; Linux'ta köprü GNOME Shell eklentisi (shell.ts), bütünleşme gnome.ts'tir.
import { shell } from '../shell'
import type { DesktopBridge, Integration } from './bridge'
import { LinuxIntegration } from './linux'
import { MacDesktop } from './macos'
import { WindowsDesktop } from './windows'

const native =
  process.platform === 'win32'
    ? new WindowsDesktop()
    : process.platform === 'darwin'
      ? new MacDesktop()
      : null

export const desktop: DesktopBridge = native ?? shell
export const integration: Integration = native ?? new LinuxIntegration()
