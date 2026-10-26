// Uçtan uca testlerin ana süreci sürmesi için (`UPASTE_TEST=1`): Playwright `electronApp.evaluate` ile
// `globalThis.__upaste` üzerinden kısayolu taklit eder, pano ve geçmişi okur.
import { clipboard, ClipboardItem, nativeImage } from 'electron'
import { history } from './history'
import { watcher } from './clipboard'
import { hidePopup, popupVisible, popupWindow, togglePopup } from './popup'
import { openSettings, settingsWindow } from './settings-window'
import { parseFocusInfo } from './shell'
import { desktop } from './platform'
import { store } from './store'
import { trayMenuTemplate } from './tray'
import { Variant } from './dbus/wire'

export function installTestHooks(): void {
  if (process.env['UPASTE_TEST'] !== '1') return
  ;(globalThis as Record<string, unknown>)['__upaste'] = {
    /** Eklentinin ShortcutPressed sinyalindeki gibi bir odak bilgisiyle kısayolu taklit eder. */
    shortcut: (info: Record<string, unknown>) => {
      const dict: Record<string, Variant> = {}
      for (const [k, v] of Object.entries(info)) {
        if (Array.isArray(v)) dict[k] = new Variant('ai', v)
        else if (typeof v === 'boolean') dict[k] = new Variant('b', v)
        else if (typeof v === 'number') dict[k] = new Variant('i', v)
        else dict[k] = new Variant('s', String(v))
      }
      return togglePopup(parseFocusInfo(dict))
    },
    hidePopup,
    popupVisible,
    popupBounds: () => popupWindow()?.getBounds() ?? null,
    capture: () => watcher.capture(true),
    clipboardChanged: () => watcher.changed(),
    writeText: (text: string) => clipboard.writeText(text),
    writeHtml: (text: string, html: string) =>
      clipboard.write([new ClipboardItem({ 'text/plain': text, 'text/html': html })]),
    writeImage: (dataUrl: string) => {
      const png = nativeImage.createFromDataURL(dataUrl).toPNG()
      return clipboard.write([
        new ClipboardItem({ 'image/png': new Blob([new Uint8Array(png)], { type: 'image/png' }) })
      ])
    },
    writeSecret: (text: string) =>
      clipboard.write([
        new ClipboardItem({
          'text/plain': text,
          'electron application/osclipboard;format="x-kde-passwordManagerHint"': 'secret'
        })
      ]),
    readText: () => clipboard.readText(),
    readSelection: () => clipboard.selection?.readText(),
    readImageSize: async () => {
      const [item] = await clipboard.read()
      if (!item?.types.includes('image/png')) return null
      const blob = (await item.getType('image/png')) as Blob
      return nativeImage.createFromBuffer(Buffer.from(await blob.arrayBuffer())).getSize()
    },
    formats: async () => (await clipboard.read()).flatMap((i) => i.types),
    items: () => history.list('', 'all'),
    get: (id: string) => history.get(id),
    setCreatedAt: (id: string, at: number) => {
      const item = history.get(id)
      if (item) item.createdAt = at
    },
    prune: () => history.prune(store.settings.retentionDays),
    settings: () => store.settings,
    openSettings,
    settingsBounds: () => settingsWindow()?.getBounds() ?? null,
    trayMenu: () => trayMenuTemplate().map((i) => i.label ?? i.type),
    clickTray: (index: number) => {
      const item = trayMenuTemplate()[index]
      ;(item?.click as (() => void) | undefined)?.()
    },
    shellActive: () => desktop.active
  }
}
