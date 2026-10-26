// UPaste ana süreci: tepside çalışır, panoyu izler, Super+V ile geçmiş penceresini açar.
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
import { broadcast, registerIpc } from './ipc'
import { shell } from './shell'
import { checkOnReopen, initUpdater } from './updater'
import { applyAutostart } from './autostart'
import { integrationState, refreshInstalledExtension, syncShortcut } from './gnome'
import { IPC } from '@shared/ipc'
import { installTestHooks } from './test-hooks'
import { debug } from './log'

const PRUNE_INTERVAL_MS = 60 * 60 * 1000
/** Yükleyicili eklentinin yeni çekirdeği klasörde görüp açması için beklenen süre. */
const EXTENSION_RELOAD_MS = 1500
const hidden = process.argv.includes('--hidden')

// Pencereler XWayland'de açılır (paket başlatıcısı ve geliştirme betikleri --ozone-platform=x11 verir): Wayland
// istemcileri kendi pencerelerini ekranda konumlandıramaz, geçmiş penceresinin metin alanının altında açılması
// için bu gerekir.
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

async function connectShell(): Promise<void> {
  try {
    const ok = await shell.start({
      show: () => void togglePopup(null),
      openSettings: () => openSettings()
    })
    if (!ok) console.error('io.github.metin_aydin.UPaste adı başka bir süreçte')
  } catch (err) {
    console.error('Oturum veri yoluna bağlanılamadı:', err)
    return
  }
  shell.on('shortcut', (info) => {
    debug('shortcut', JSON.stringify(info))
    void togglePopup(info)
  })
  shell.on('key', handleCapturedKey)
  shell.on('search', handleSearchText)
  shell.on('clicked-outside', () => {
    debug('clicked-outside')
    hidePopup(false)
  })
  shell.on('clipboard-changed', () => {
    debug('clipboard-changed')
    watcher.changed()
  })
  shell.on('shell-restarted', () => void watchExtension())
  if (refreshInstalledExtension()) setTimeout(() => void watchExtension(), EXTENSION_RELOAD_MS)
  await watchExtension()
}

/**
 * Eklentinin hazır olduğunu izler: oturum açılışında uygulama kabuktan önce başlayabilir, kabuk yoğunken ilk soru
 * zaman aşımına uğrayabilir. Eklenti yanıt verene kadar önce 2 sn, bir dakika sonra 30 sn arayla yeniden sorulur;
 * yanıt gelince kısayol bildirilir ve ayarlar penceresi güncellenir.
 */
async function watchExtension(): Promise<void> {
  const started = Date.now()
  const check = async (): Promise<void> => {
    const before = shell.apiVersion
    await shell.version()
    debug('extension', shell.apiVersion)
    if (shell.active) {
      if (shell.apiVersion !== before) {
        ensurePopup()
        await syncShortcut()
        broadcast(IPC.integrationChanged, await integrationState())
      }
      return
    }
    setTimeout(() => void check(), Date.now() - started < 60_000 ? 2000 : 30_000)
  }
  await check()
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

  await connectShell()
  watcher.start(() => shell.active)
  void watcher.capture(true)
  applyAutostart(store.settings.launchAtLogin)
  initUpdater(() => [popupWindow(), settingsWindow()].filter((w): w is BrowserWindow => !!w))

  const integration = await integrationState()
  if (integration.extension === 'outdated') notifyRelogin()
  if (!store.integration.setupShown || (!hidden && !integration.ready)) {
    store.updateIntegration({ setupShown: true })
    openSettings(integration.ready ? undefined : 'setup')
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
