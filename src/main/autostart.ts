// Oturum açılınca başlatma: ~/.config/autostart/upaste.desktop. Yalnız paketlenmiş uygulamada yazılır; AppImage
// için dosyanın kendisi, .deb için kurulu başlatıcı çalıştırılır. Uygulama tepside gizli açılır (`--hidden`).
import { app } from 'electron'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { basename, dirname, join } from 'path'

const configHome = (): string => process.env['XDG_CONFIG_HOME'] || join(homedir(), '.config')
export const autostartFile = (): string => join(configHome(), 'autostart', 'upaste.desktop')

/** Paketin başlatıcısı (.deb'de Electron ikilisi `-bin` adını taşır, başlatıcı betik onun yanındadır). */
function launcher(): string | null {
  if (process.env['APPIMAGE']) return process.env['APPIMAGE']
  if (!app.isPackaged) return null
  const script = join(dirname(process.execPath), basename(process.execPath).replace(/-bin$/, ''))
  return existsSync(script) ? script : process.execPath
}

const quote = (s: string): string => `"${s.replace(/(["`$\\])/g, '\\$1')}"`

export function applyAutostart(enabled: boolean): void {
  if (process.env['UPASTE_TEST'] === '1' && process.env['UPASTE_TEST_AUTOSTART'] !== '1') return
  const file = autostartFile()
  const exec = launcher()
  if (!enabled || !exec) {
    if (!enabled) rmSync(file, { force: true })
    return
  }
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(
    file,
    [
      '[Desktop Entry]',
      'Type=Application',
      'Name=UPaste',
      'Comment=Clipboard history (Super+V)',
      `Exec=${quote(exec)} --hidden`,
      'Icon=upaste',
      'Terminal=false',
      'X-GNOME-Autostart-enabled=true',
      'X-GNOME-Autostart-Delay=2',
      ''
    ].join('\n')
  )
}
