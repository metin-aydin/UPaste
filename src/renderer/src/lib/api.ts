// Ana sürece giden çağrıların türlü sarmalayıcıları.
import { IPC, type PopupShown, type SettingsSection, type UiInfo } from '@shared/ipc'
import type {
  HistoryStats,
  IntegrationState,
  PopupFilter,
  PopupItem,
  Settings
} from '@shared/types'
import type { UpdateState } from '@shared/update'

const bridge = window.upaste

export const api = {
  uiInfo: () => bridge.invoke(IPC.uiInfo) as Promise<UiInfo>,
  onUiChanged: (cb: (info: UiInfo) => void) =>
    bridge.on(IPC.uiChanged, (info) => cb(info as UiInfo)),
  openSettings: (section?: SettingsSection) => bridge.send(IPC.openSettings, section),
  openExternal: (url: string) => bridge.invoke(IPC.openExternal, url),

  list: (query: string, filter: PopupFilter) =>
    bridge.invoke(IPC.popupList, query, filter) as Promise<PopupItem[]>,
  paste: (id: string, plain: boolean) =>
    bridge.invoke(IPC.popupPaste, id, plain) as Promise<boolean>,
  pin: (id: string, pinned: boolean) => bridge.invoke(IPC.popupPin, id, pinned),
  remove: (id: string) => bridge.invoke(IPC.popupDelete, id),
  closePopup: () => bridge.send(IPC.popupClose),
  onPopupShown: (cb: (p: PopupShown & { items: PopupItem[]; filter: PopupFilter }) => void) =>
    bridge.on(IPC.popupShown, (p) =>
      cb(p as PopupShown & { items: PopupItem[]; filter: PopupFilter })
    ),
  onHistoryChanged: (cb: () => void) => bridge.on(IPC.historyChanged, () => cb()),
  onPopupKey: (cb: (key: string) => void) => bridge.on(IPC.popupKey, (k) => cb(k as string)),
  onPopupFocus: (cb: () => void) => bridge.on(IPC.popupFocus, () => cb()),
  requestFocus: () => bridge.send(IPC.popupRequestFocus),
  onPopupQuery: (cb: (text: string) => void) => bridge.on(IPC.popupQuery, (q) => cb(q as string)),
  onPopupTyping: (cb: (typing: boolean) => void) =>
    bridge.on(IPC.popupTyping, (v) => cb(v === true)),

  settings: () => bridge.invoke(IPC.settingsGet) as Promise<Settings>,
  setSettings: (patch: Partial<Settings>) =>
    bridge.invoke(IPC.settingsSet, patch) as Promise<Settings>,
  onNavigate: (cb: (section: SettingsSection) => void) =>
    bridge.on(IPC.settingsNavigate, (s) => cb(s as SettingsSection)),
  stats: () => bridge.invoke(IPC.historyStats) as Promise<HistoryStats>,
  clearHistory: (includePinned: boolean) =>
    bridge.invoke(IPC.historyClear, includePinned) as Promise<HistoryStats>,

  integration: () => bridge.invoke(IPC.integrationGet) as Promise<IntegrationState>,
  installExtension: () => bridge.invoke(IPC.integrationInstall),
  takeOver: () => bridge.invoke(IPC.integrationTakeOver),
  restore: () => bridge.invoke(IPC.integrationRestore),
  logout: () => bridge.invoke(IPC.integrationLogout),
  requestAccess: () => bridge.invoke(IPC.integrationRequestAccess),
  setShortcut: (accel: string) => bridge.invoke(IPC.integrationSetShortcut, accel),
  pauseShortcut: (paused: boolean) => bridge.invoke(IPC.integrationPauseShortcut, paused),
  onIntegration: (cb: (s: IntegrationState) => void) =>
    bridge.on(IPC.integrationChanged, (s) => cb(s as IntegrationState)),

  update: () => bridge.invoke(IPC.updateGet) as Promise<UpdateState>,
  checkUpdate: () => bridge.invoke(IPC.updateCheck) as Promise<UpdateState>,
  downloadUpdate: () => bridge.invoke(IPC.updateDownload) as Promise<UpdateState>,
  installUpdate: () => bridge.invoke(IPC.updateInstall),
  setAutoCheck: (enabled: boolean) =>
    bridge.invoke(IPC.updateAutoCheck, enabled) as Promise<UpdateState>,
  onUpdate: (cb: (s: UpdateState) => void) =>
    bridge.on(IPC.updateState, (s) => cb(s as UpdateState))
}
