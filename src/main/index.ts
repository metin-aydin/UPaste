// UPaste ana süreci: tepside (macOS'ta menü çubuğunda) çalışır, panoyu izler, kısayolla geçmiş penceresini açar.
import { app, BrowserWindow, Menu, net, Notification, protocol } from 'electron'
import { pathToFileURL } from 'url'
import { history, IMAGE_SCHEME } from './history'
import { watcher } from './clipboard'
import { store } from './store'
import { mt, setLanguage } from './i18n'
import {
  createPopup,
  ensurePopup,
  handleCapturedKey,
  handleSearchText,
  hidePopup,
  popupWindow,
  togglePopup
} from './popup'
import { openSettings, settingsWindow } from './settings-window'
import { createTray } from './tray'
import { registerIpc } from './ipc'
import { checkOnReopen, initUpdater } from './updater'
import { applyAutostart, openedAtLogin } from './autostart'
import { desktop, integration } from './platform'
import { installTestHooks } from './test-hooks'
import { debug } from './log'

const PRUNE_INTERVAL_MS = 60 * 60 * 1000

// Linux'ta pencereler XWayland'de açılır (paket başlatıcısı ve geliştirme betikleri --ozone-platform=x11 verir):
// Wayland istemcileri kendi pencerelerini ekranda konumlandıramaz, geçmiş penceresinin metin alanının altında
// açılması için bu gerekir.
app.setName('UPaste')

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  protocol.registerSchemesAsPrivileged([
    { scheme: IMAGE_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
  ])
  app.on('second-instance', () => openSettings())
  app.on('window-all-closed', () => {
    // Tepside çalışmaya devam eder; yalnız tepsi menüsündeki "Kapat" uygulamayı kapatır.
  })
  app.on('before-quit', () => history.flush())
  app.on('will-quit', () => integration.stop())
  void app.whenReady().then(start)
}

function registerImageProtocol(): void {
  protocol.handle(IMAGE_SCHEME, (request) => {
    const url = new URL(request.url)
    const id = url.pathname.replace(/^\//, '')
    if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 })
    const file = history.imagePath(id, url.hostname === 'thumb')
    return net.fetch(pathToFileURL(file).toString())
  })
}

/** Masaüstü katmanının olayları: kısayol, pano değişimi ve (GNOME'da) yakalanan tuşlar, arama, dışarı tıklama. */
function wireDesktop(): void {
  desktop.on('shortcut', (info) => {
    debug('shortcut', JSON.stringify(info))
    void togglePopup(info)
  })
  desktop.on('key', handleCapturedKey)
  desktop.on('search', handleSearchText)
  desktop.on('clicked-outside', () => {
    debug('clicked-outside')
    hidePopup(false)
  })
  desktop.on('clipboard-changed', () => {
    debug('clipboard-changed')
    watcher.changed()
  })
}

let reloginNotice: Notification | null = null

/** Yeni eklenti kodu ancak oturum yenilenince yüklenebiliyorsa haber verir; bildirime tıklayınca Kurulum açılır. */
function notifyRelogin(): void {
  if (!Notification.isSupported() || process.env['UPASTE_TEST'] === '1') return
  reloginNotice = new Notification({ title: 'UPaste', body: mt('notify.relogin') })
  reloginNotice.on('click', () => openSettings('setup'))
  reloginNotice.show()
}

async function start(): Promise<void> {
  Menu.setApplicationMenu(null)
  // macOS'ta Dock simgesi gösterilmez; uygulama menü çubuğundaki simgeden yönetilir.
  app.dock?.hide()
  store.load()
  history.load()
  setLanguage(store.settings.language)
  registerImageProtocol()
  registerIpc()
  createPopup()
  createTray()
  installTestHooks()

  history.prune(store.settings.retentionDays)
  setInterval(() => history.prune(store.settings.retentionDays), PRUNE_INTERVAL_MS)

  wireDesktop()
  await integration.start({
    showHistory: () => void togglePopup(null),
    openSettings: () => openSettings(),
    bridgeChanged: () => ensurePopup()
  })
  watcher.start(() => desktop.active)
  void watcher.capture(true)
  applyAutostart(store.settings.launchAtLogin)
  initUpdater(() => [popupWindow(), settingsWindow()].filter((w): w is BrowserWindow => !!w))

  // Oturum açılışında başlatıldıysa ayarlar penceresi (kurulum tamamsa) açılmaz.
  const hidden = process.argv.includes('--hidden') || openedAtLogin()
  const state = await integration.state()
  if (state.extension === 'outdated') notifyRelogin()
  if (!store.integration.setupShown || (!hidden && !state.ready)) {
    store.updateIntegration({ setupShown: true })
    openSettings(state.ready ? undefined : 'setup')
  } else if (!hidden) {
    openSettings()
  }
  app.on('browser-window-focus', (_e, w) => {
    if (w === settingsWindow()) {
      hidePopup()
      checkOnReopen()
    }
  })
}
