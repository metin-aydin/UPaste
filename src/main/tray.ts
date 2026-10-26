// Sistem tepsisi simgesi. GNOME'da (AppIndicator) simgeye tıklamak menüyü açar: Ayarlar ve Kapat; yeni sürüm
// indirildiyse kurma öğesi de görünür.
import { app, Menu, Tray, nativeImage, type MenuItemConstructorOptions } from 'electron'
import { mt } from './i18n'
import { openSettings } from './settings-window'
import { installUpdate, updateEvents, updateState } from './updater'
import trayIcon from '../../resources/tray/tray.png?asset'
import trayIcon2x from '../../resources/tray/tray@2x.png?asset'

let tray: Tray | null = null
/** Testler menüyü tepsiye tıklamadan okur ve çalıştırır. */
let lastTemplate: MenuItemConstructorOptions[] = []

function image(): Electron.NativeImage {
  const img = nativeImage.createFromPath(trayIcon)
  img.addRepresentation({ scaleFactor: 2, buffer: nativeImage.createFromPath(trayIcon2x).toPNG() })
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
  refreshTray()
  updateEvents.on('state', refreshTray)
}

export const trayMenuTemplate = (): MenuItemConstructorOptions[] => lastTemplate
