// Ayarlar penceresi: tek örnek; yeniden açılınca öne gelir ve istenen bölüme geçer.
import { app, BrowserWindow, nativeTheme } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { IPC, type SettingsSection } from '@shared/ipc'
import { mt } from './i18n'
import { desktop } from './platform'
import { store } from './store'
import icon from '../../build/icon.png?asset'

let win: BrowserWindow | null = null

const dark = (): boolean =>
  store.settings.theme === 'dark' ||
  (store.settings.theme === 'system' && nativeTheme.shouldUseDarkColors)

export const settingsWindow = (): BrowserWindow | null => win

/** macOS'ta menü çubuğu uygulamasının penceresi ancak uygulama etkinleşince öne gelir. */
const activateApp = (): void => {
  if (process.platform === 'darwin') app.focus({ steal: true })
}

export function openSettings(section?: SettingsSection): void {
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore()
    activateApp()
    win.show()
    win.focus()
    if (section) win.webContents.send(IPC.settingsNavigate, section)
    if (desktop.active) void desktop.focusOwnWindow(win.getTitle()).catch(() => false)
    return
  }
  win = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 760,
    minHeight: 520,
    show: false,
    title: mt('settings.title'),
    icon,
    autoHideMenuBar: true,
    backgroundColor: dark() ? '#0a0a0b' : '#ffffff',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      spellcheck: false
    }
  })
  win.setMenu(null)
  win.on('page-title-updated', (e) => e.preventDefault())
  win.once('ready-to-show', () => {
    activateApp()
    win?.show()
    win?.focus()
    if (desktop.active && win) void desktop.focusOwnWindow(win.getTitle()).catch(() => false)
  })
  win.on('closed', () => {
    win = null
  })
  const hash = section ?? ''
  if (is.dev && process.env['ELECTRON_RENDERER_URL'])
    void win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/settings.html#${hash}`)
  else void win.loadFile(join(__dirname, '../renderer/settings.html'), { hash })
}

/** Dil değişince pencere başlığı da çevrilir. */
export function retitleSettings(): void {
  if (win && !win.isDestroyed()) win.setTitle(mt('settings.title'))
}
