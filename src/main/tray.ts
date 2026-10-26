// Sistem tepsisi simgesi (macOS'ta menü çubuğu). Simgeye tıklamak menüyü açar: Ayarlar ve Kapat; yeni sürüm
// indirildiyse kurma öğesi de görünür. GNOME'da beyaz çizgi, Windows'ta uygulama simgesi, macOS'ta sistemin açık/koyu
// menü çubuğuna göre renklendirdiği şablon simgesi kullanılır.
import { app, Menu, Tray, nativeImage, type MenuItemConstructorOptions } from 'electron'
import { mt } from './i18n'
import { openSettings } from './settings-window'
import { installUpdate, updateEvents, updateState } from './updater'
import trayIcon from '../../resources/tray/tray.png?asset'
import trayIcon2x from '../../resources/tray/tray@2x.png?asset'
import templateIcon from '../../resources/tray/trayTemplate.png?asset'
import templateIcon2x from '../../resources/tray/trayTemplate@2x.png?asset'
import appIcon16 from '../../build/icons/16x16.png?asset'
import appIcon32 from '../../build/icons/32x32.png?asset'

let tray: Tray | null = null
/** Testler menüyü tepsiye tıklamadan okur ve çalıştırır. */
let lastTemplate: MenuItemConstructorOptions[] = []

function image(): Electron.NativeImage {
  const [one, two] =
    process.platform === 'darwin'
      ? [templateIcon, templateIcon2x]
      : process.platform === 'win32'
        ? [appIcon16, appIcon32]
        : [trayIcon, trayIcon2x]
  const img = nativeImage.createFromPath(one)
  img.addRepresentation({ scaleFactor: 2, buffer: nativeImage.createFromPath(two).toPNG() })
  if (process.platform === 'darwin') img.setTemplateImage(true)
  return img
}

function template(): MenuItemConstructorOptions[] {
  const items: MenuItemConstructorOptions[] = [
    { label: mt('tray.settings'), click: () => openSettings() }
  ]
  const update = updateState()
  if (update.status === 'downloaded' && update.version) {
    items.push({
      label: mt('tray.update', { version: update.version }),
      click: () => installUpdate()
    })
  }
  items.push({ type: 'separator' }, { label: mt('tray.quit'), click: () => app.quit() })
  return items
}

export function refreshTray(): void {
  if (!tray) return
  lastTemplate = template()
  tray.setContextMenu(Menu.buildFromTemplate(lastTemplate))
  tray.setToolTip('UPaste')
}

export function createTray(): void {
  tray = new Tray(image())
  // Windows'ta menü yalnız sağ tıklamada açılır; sol tıklama da aynı menüyü açar.
  if (process.platform === 'win32') tray.on('click', () => tray?.popUpContextMenu())
  refreshTray()
  updateEvents.on('state', refreshTray)
}

export const trayMenuTemplate = (): MenuItemConstructorOptions[] => lastTemplate
