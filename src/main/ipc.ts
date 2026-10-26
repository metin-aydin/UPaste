// Pencerelerden gelen istekler. Her kanal yalnız beklenen türde argüman kabul eder.
import { app, BrowserWindow, ipcMain, nativeTheme, shell as electronShell } from 'electron'
import { IPC, type SettingsSection, type UiInfo } from '@shared/ipc'
import type { PopupFilter, Settings } from '@shared/types'
import { history } from './history'
import { currentLocale, setLanguage, systemLocale } from './i18n'
import { hidePopup, pasteItem, startSearch } from './popup'
import { openSettings, retitleSettings } from './settings-window'
import { store } from './store'
import { refreshTray } from './tray'
import { applyAutostart } from './autostart'
import { platform } from './shortcut'
import {
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  setAutoCheck,
  updateState
} from './updater'
import { integration } from './platform'

const FILTERS: PopupFilter[] = ['all', 'text', 'image', 'pinned']
const SECTIONS: SettingsSection[] = ['general', 'history', 'setup', 'updates', 'about']
const EXTERNAL = /^https:\/\/github\.com\/metin-aydin\/UPaste(\/[\w\-./?=#&%]*)?$/

const str = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.slice(0, max) : '')

export const dark = (): boolean =>
  store.settings.theme === 'dark' ||
  (store.settings.theme === 'system' && nativeTheme.shouldUseDarkColors)

export const uiInfo = (): UiInfo => ({
  locale: currentLocale(),
  systemLocale: systemLocale(),
  dark: dark(),
  version: app.getVersion(),
  platform
})

export function broadcast(channel: string, ...args: unknown[]): void {
  for (const w of BrowserWindow.getAllWindows())
    if (!w.isDestroyed()) w.webContents.send(channel, ...args)
}

export const broadcastUi = (): void => broadcast(IPC.uiChanged, uiInfo())

export async function broadcastIntegration(): Promise<void> {
  broadcast(IPC.integrationChanged, await integration.state())
}

export function registerIpc(): void {
  ipcMain.handle(IPC.uiInfo, () => uiInfo())
  ipcMain.on(IPC.openSettings, (_e, section: unknown) => {
    hidePopup()
    openSettings(
      SECTIONS.includes(section as SettingsSection) ? (section as SettingsSection) : undefined
    )
  })
  ipcMain.handle(IPC.openExternal, (_e, url: unknown) => {
    const u = str(url)
    if (EXTERNAL.test(u)) void electronShell.openExternal(u)
  })

  ipcMain.handle(IPC.popupList, (_e, query: unknown, filter: unknown) =>
    history.list(
      str(query, 500),
      FILTERS.includes(filter as PopupFilter) ? (filter as PopupFilter) : 'all'
    )
  )
  ipcMain.handle(IPC.popupPaste, (_e, id: unknown, plain: unknown) =>
    pasteItem(str(id, 64), plain === true)
  )
  ipcMain.handle(IPC.popupPin, (_e, id: unknown, pinned: unknown) =>
    history.setPinned(str(id, 64), pinned === true)
  )
  ipcMain.handle(IPC.popupDelete, (_e, id: unknown) => history.remove(str(id, 64)))
  ipcMain.on(IPC.popupClose, () => hidePopup())
  ipcMain.on(IPC.popupRequestFocus, () => void startSearch())

  ipcMain.handle(IPC.settingsGet, () => store.settings)
  ipcMain.handle(IPC.settingsSet, (_e, patch: unknown) => {
    const before = store.settings
    const next = store.updateSettings((patch ?? {}) as Partial<Settings>)
    if (next.language !== before.language) {
      setLanguage(next.language)
      refreshTray()
      retitleSettings()
    }
    if (next.retentionDays !== before.retentionDays) history.prune(next.retentionDays)
    if (next.launchAtLogin !== before.launchAtLogin) applyAutostart(next.launchAtLogin)
    if (next.language !== before.language || next.theme !== before.theme) broadcastUi()
    return next
  })
  ipcMain.handle(IPC.historyStats, () => history.stats())
  ipcMain.handle(IPC.historyClear, (_e, includePinned: unknown) => {
    history.clear(includePinned === true)
    return history.stats()
  })

  ipcMain.handle(IPC.integrationGet, () => integration.state())
  ipcMain.handle(IPC.integrationInstall, async () => {
    await integration.install()
    await broadcastIntegration()
  })
  ipcMain.handle(IPC.integrationTakeOver, async () => {
    await integration.takeOver()
    await broadcastIntegration()
  })
  ipcMain.handle(IPC.integrationRestore, async () => {
    await integration.restore()
    await broadcastIntegration()
  })
  ipcMain.handle(IPC.integrationLogout, () => integration.logout())
  ipcMain.handle(IPC.integrationRequestAccess, async () => {
    await integration.requestAccess()
    await broadcastIntegration()
  })
  ipcMain.handle(IPC.integrationSetShortcut, async (_e, accel: unknown) => {
    const a = str(accel, 100)
    if (/^(<[A-Za-z0-9]+>)+[A-Za-z0-9_]+$/.test(a)) await integration.setShortcut(a)
    await broadcastIntegration()
  })
  ipcMain.handle(IPC.integrationPauseShortcut, (_e, paused: unknown) =>
    integration.pauseShortcut(paused === true)
  )
  integration.on('changed', () => void broadcastIntegration())

  ipcMain.handle(IPC.updateGet, () => updateState())
  ipcMain.handle(IPC.updateCheck, () => checkForUpdates())
  ipcMain.handle(IPC.updateDownload, () => downloadUpdate())
  ipcMain.handle(IPC.updateInstall, () => installUpdate())
  ipcMain.handle(IPC.updateAutoCheck, (_e, enabled: unknown) => setAutoCheck(enabled === true))

  history.on('changed', () => broadcast(IPC.historyChanged))
  nativeTheme.on('updated', broadcastUi)
}
