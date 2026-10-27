// GNOME masaüstüyle bütünleşme: eklentiyi kurma ve durumu, Super+V'yi tutan bağlamaları bulma, devralma ve geri
// yükleme. Ayarlar `gsettings` ile okunup yazılır; değiştirilen her değer önceki hâliyle kaydedilir.
import { app } from 'electron'
import { execFile, spawn } from 'child_process'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync
} from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { promisify } from 'util'
import type { ExtensionStatus, IntegrationState, ShortcutConflict } from '@shared/types'
import { defaultShortcut } from '@shared/accelerator'
import { currentShortcut } from './shortcut'
import { EXTENSION_API, shell } from './shell'
import { store, writeJsonAtomic, type SavedBinding } from './store'
import { mt } from './i18n'
import { unwrap } from './dbus/wire'
import { debug } from './log'

const run = promisify(execFile)

export const EXTENSION_UUID = 'upaste@metin-aydin.github.io'
export const DEFAULT_SHORTCUT = defaultShortcut('linux')

/** Kullanıcının seçtiği kısayol (GTK hızlandırıcı biçiminde). */
export { currentShortcut }
const CUSTOM_SCHEMA = 'org.gnome.settings-daemon.plugins.media-keys.custom-keybinding'
const MEDIA_KEYS = 'org.gnome.settings-daemon.plugins.media-keys'
const KEYBINDING_SCHEMAS = [
  'org.gnome.shell.keybindings',
  'org.gnome.desktop.wm.keybindings',
  'org.gnome.mutter.keybindings',
  'org.gnome.mutter.wayland.keybindings',
  MEDIA_KEYS
]

/**
 * Testlerde masaüstü ayarlarına dokunulmaz; yalnız yalıtılmış iç içe kabuktaki testler (`UPASTE_NESTED=1`, ayrı
 * dconf) kısayol ve eklenti adımlarını gerçekten çalıştırır.
 */
export const desktopTouchAllowed = (): boolean =>
  process.env['UPASTE_TEST'] !== '1' || process.env['UPASTE_NESTED'] === '1'

export const isGnome = (): boolean =>
  (process.env['XDG_CURRENT_DESKTOP'] ?? '').split(':').some((d) => d.toUpperCase() === 'GNOME')

export const sessionType = (): IntegrationState['session'] => {
  const t = process.env['XDG_SESSION_TYPE']
  return t === 'wayland' || t === 'x11' ? t : 'unknown'
}

// --- gsettings ---

async function gsettings(...args: string[]): Promise<string> {
  const { stdout } = await run('gsettings', args, { timeout: 5000 })
  return stdout.trim()
}

const schemaArg = (schema: string, path?: string): string => (path ? `${schema}:${path}` : schema)

export const getSetting = (schema: string, key: string, path?: string): Promise<string> =>
  gsettings('get', schemaArg(schema, path), key)

export const setSetting = async (
  schema: string,
  key: string,
  value: string,
  path?: string
): Promise<void> => {
  await gsettings('set', schemaArg(schema, path), key, value)
}

/** GVariant metnindeki dizeleri sırayla çıkarır: `['a', "b'c"]`, `@as []`, `'x'`. */
export function parseStrings(text: string): string[] {
  const out: string[] = []
  const re = /'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"/g
  for (const m of text.matchAll(re)) out.push((m[1] ?? m[2]).replace(/\\(.)/g, '$1'))
  return out
}

export const formatStrings = (list: string[]): string =>
  list.length
    ? `[${list.map((s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`).join(', ')}]`
    : '@as []'

/** Kısayolları karşılaştırmak için: büyük/küçük harf, değiştirici adı ve sırası önemsizdir. */
export function normalizeAccelerator(accel: string): string {
  const mods: string[] = []
  const key = accel
    .replace(/<([^>]+)>/g, (_m, mod: string) => {
      const m = mod.toLowerCase()
      mods.push(m === 'mod4' ? 'super' : m === 'primary' || m === 'ctrl' ? 'control' : m)
      return ''
    })
    .trim()
    .toLowerCase()
  return (
    [...new Set(mods)]
      .sort()
      .map((m) => `<${m}>`)
      .join('') + key
  )
}

const sameAccelerator = (a: string, b: string): boolean =>
  !!a && !!b && normalizeAccelerator(a) === normalizeAccelerator(b)

interface Holder extends SavedBinding {
  /** Super+V çıkarılınca yazılacak değer. */
  next: string
}

async function listSchemas(): Promise<Set<string>> {
  try {
    return new Set((await gsettings('list-schemas')).split('\n'))
  } catch {
    return new Set()
  }
}

/** Super+V'yi tutan bütün bağlamalar (kabuk/pencere yöneticisi kısayolları ve özel kısayollar). */
async function findHolders(accel = currentShortcut()): Promise<Holder[]> {
  const isShortcut = (s: string): boolean => sameAccelerator(s, accel)
  const holders: Holder[] = []
  const schemas = await listSchemas()
  for (const schema of KEYBINDING_SCHEMAS) {
    if (!schemas.has(schema)) continue
    let listing = ''
    try {
      listing = await gsettings('list-recursively', schema)
    } catch {
      continue
    }
    for (const line of listing.split('\n')) {
      const [, key, ...rest] = line.split(' ')
      const value = rest.join(' ')
      if (!key || key === 'custom-keybindings') continue
      const strings = parseStrings(value)
      if (!strings.some(isShortcut)) continue
      const isList = value.startsWith('[') || value.startsWith('@as')
      const next = isList ? formatStrings(strings.filter((s) => !isShortcut(s))) : "''"
      const name = key === 'toggle-message-tray' ? mt('setup.messageTray') : key.replace(/-/g, ' ')
      holders.push({ schema, key, previous: value, next, name })
    }
  }
  if (schemas.has(MEDIA_KEYS)) {
    try {
      const paths = parseStrings(await getSetting(MEDIA_KEYS, 'custom-keybindings'))
      for (const path of paths) {
        const binding = parseStrings(await getSetting(CUSTOM_SCHEMA, 'binding', path))[0] ?? ''
        if (!isShortcut(binding)) continue
        const name = parseStrings(await getSetting(CUSTOM_SCHEMA, 'name', path))[0] || binding
        holders.push({
          schema: CUSTOM_SCHEMA,
          path,
          key: 'binding',
          previous: `'${binding}'`,
          next: "''",
          name
        })
      }
    } catch (err) {
      console.error('Özel kısayollar okunamadı:', err)
    }
  }
  return holders
}

export async function shortcutConflicts(): Promise<ShortcutConflict[]> {
  if (!isGnome()) return []
  return (await findHolders()).map((h) => ({ name: h.name }))
}

// --- eklentinin göreceği kısayol ---

function writeShellConfig(): void {
  const shortcut = store.integration.shortcutEnabled ? currentShortcut() : ''
  try {
    writeJsonAtomic(join(app.getPath('userData'), 'shell.json'), { shortcut })
  } catch (err) {
    console.error('shell.json yazılamadı:', err)
  }
}

let grabbed = false

/** Eklentiye güncel kısayolu bildirir (eklenti yeniden yüklenince ya da kısayol değişince). */
export async function syncShortcut(): Promise<void> {
  writeShellConfig()
  if (!shell.active) {
    grabbed = false
    return
  }
  try {
    grabbed = await shell.setShortcut(store.integration.shortcutEnabled ? currentShortcut() : '')
    debug('shortcut grabbed', grabbed)
  } catch (err) {
    grabbed = false
    console.error('Kısayol eklentiye bildirilemedi:', err)
  }
}

/** Kısayolu tutan bağlamaları kapatır, önceki değerlerini kaydeder ve kısayolu eklentiye verir. */
export async function takeOverShortcut(): Promise<void> {
  if (!desktopTouchAllowed() || !isGnome()) return
  const holders = await findHolders()
  const saved = [...store.integration.savedBindings]
  for (const h of holders) {
    await setSetting(h.schema, h.key, h.next, h.path)
    const same = (s: SavedBinding): boolean =>
      s.schema === h.schema && s.key === h.key && s.path === h.path
    if (!saved.some(same))
      saved.push({ schema: h.schema, path: h.path, key: h.key, previous: h.previous, name: h.name })
  }
  store.updateIntegration({ savedBindings: saved, shortcutEnabled: true })
  // Kısayolu bırakan bağlama hemen boşalmayabilir (gsd yeniden bağlar); eklenti de kendi denemesini sürdürür.
  await syncShortcut()
}

async function restoreSavedBindings(): Promise<void> {
  for (const s of store.integration.savedBindings) {
    try {
      await setSetting(s.schema, s.key, s.previous, s.path)
    } catch (err) {
      console.error('Kısayol geri yüklenemedi:', s, err)
    }
  }
  store.updateIntegration({ savedBindings: [] })
}

/** Kaydedilen bağlamaları eski değerlerine döndürür ve eklentinin kısayolu bırakmasını sağlar. */
export async function restoreShortcut(): Promise<void> {
  if (!desktopTouchAllowed()) return
  store.updateIntegration({ shortcutEnabled: false })
  await syncShortcut()
  await restoreSavedBindings()
}

/**
 * Kısayolu değiştirir. Eski kısayol için devre dışı bırakılan bağlamalar geri yüklenir; yenisini başka bir bağlama
 * tutuyorsa kurulum sayfası çakışmayı gösterir ve kullanıcı "UPaste İçin Kullan" ile alır.
 */
export async function changeShortcut(accel: string): Promise<void> {
  if (!desktopTouchAllowed()) return
  const next = accel.trim()
  if (!next) return
  if (!sameAccelerator(next, currentShortcut())) {
    await restoreSavedBindings()
    store.updateIntegration({ shortcut: next })
  }
  store.updateIntegration({ shortcutEnabled: true })
  await syncShortcut()
}

/** Kısayol kaydedilirken eklenti kısayolu geçici olarak bırakır; tuşlar ayarlar penceresine ulaşır. */
export async function pauseShortcut(paused: boolean): Promise<void> {
  if (!shell.active) return
  if (!paused) {
    await syncShortcut()
    return
  }
  await shell.setShortcut('').catch(() => false)
  grabbed = false
}

// --- eklenti dosyaları ---

const dataHome = (): string => process.env['XDG_DATA_HOME'] || join(homedir(), '.local/share')
const installedDir = (): string => join(dataHome(), 'gnome-shell/extensions', EXTENSION_UUID)

/** Uygulamayla gelen eklenti klasörü (paketlenmiş uygulamada asar dışına açılmış kopya). */
export function bundledExtensionDir(): string {
  const base = join(app.getAppPath(), 'resources/gnome-extension', EXTENSION_UUID)
  return base.replace(/app\.asar([/\\])/, 'app.asar.unpacked$1')
}

const metadataVersion = (dir: string): number => {
  try {
    return Number(JSON.parse(readFileSync(join(dir, 'metadata.json'), 'utf8')).version) || 0
  } catch {
    return 0
  }
}

const CORE_FILE = /^core(?:-\d+)?\.js$/

/**
 * Eklenti dosyalarını kullanıcının eklenti klasörüne kopyalar. Çekirdek `core-<sürüm>.js` adıyla en son ve tek
 * adımda (yeniden adlandırarak) yerine konur: klasörü izleyen yükleyici yalnız tamamlanmış dosyayı görür ve onu
 * oturumu yenilemeden yükler. Klasör silinmez, çünkü yükleyici onu izliyor.
 */
function copyExtension(): void {
  const source = bundledExtensionDir()
  const target = installedDir()
  const core = `core-${metadataVersion(source)}.js`
  mkdirSync(target, { recursive: true })
  for (const name of readdirSync(source))
    if (name !== 'core.js') cpSync(join(source, name), join(target, name), { recursive: true })
  const temp = join(target, `.${core}.tmp`)
  copyFileSync(join(source, 'core.js'), temp)
  renameSync(temp, join(target, core))
  for (const name of readdirSync(target))
    if (CORE_FILE.test(name) && name !== core) rmSync(join(target, name), { force: true })
}

/**
 * Kurulu eklenti uygulamayla gelenden eskiyse dosyalar yenilenir. Yükleyicili eklenti (API 4+) yeni çekirdeği hemen
 * yükler; daha eski eklentiler yeni kodu bir sonraki oturumda yükler. Dosyalar yenilendiyse `true` döner.
 */
export function refreshInstalledExtension(): boolean {
  if (!desktopTouchAllowed()) return false
  const installed = metadataVersion(installedDir())
  if (!installed || installed >= metadataVersion(bundledExtensionDir())) return false
  try {
    copyExtension()
    return true
  } catch (err) {
    console.error('Eklenti güncellenemedi:', err)
    return false
  }
}

async function shellExtensions(
  member: string,
  signature?: string,
  body?: unknown[]
): Promise<unknown[]> {
  if (!shell.bus) throw new Error('D-Bus is not connected')
  return shell.bus.call({
    destination: 'org.gnome.Shell',
    path: '/org/gnome/Shell',
    interface: 'org.gnome.Shell.Extensions',
    member,
    signature,
    body,
    timeout: 5000
  })
}

async function extensionInfo(): Promise<Record<string, unknown>> {
  try {
    const [info] = await shellExtensions('GetExtensionInfo', 's', [EXTENSION_UUID])
    return (unwrap(info) ?? {}) as Record<string, unknown>
  } catch {
    return {}
  }
}

/** Eklentiyi kurar, etkin listesine ekler; kabuk onu zaten tanıyorsa hemen etkinleştirir. */
export async function installExtension(): Promise<void> {
  if (!desktopTouchAllowed() || !isGnome()) return
  copyExtension()
  try {
    const enabled = parseStrings(await getSetting('org.gnome.shell', 'enabled-extensions'))
    if (!enabled.includes(EXTENSION_UUID))
      await setSetting(
        'org.gnome.shell',
        'enabled-extensions',
        formatStrings([...enabled, EXTENSION_UUID])
      )
    const disabled = parseStrings(await getSetting('org.gnome.shell', 'disabled-extensions'))
    if (disabled.includes(EXTENSION_UUID))
      await setSetting(
        'org.gnome.shell',
        'disabled-extensions',
        formatStrings(disabled.filter((u) => u !== EXTENSION_UUID))
      )
  } catch (err) {
    console.error('Eklenti etkin listesine eklenemedi:', err)
  }
  const info = await extensionInfo()
  if (Object.keys(info).length) {
    try {
      await shellExtensions('EnableExtension', 's', [EXTENSION_UUID])
    } catch (err) {
      console.error('Eklenti etkinleştirilemedi:', err)
    }
  }
  await shell.version()
  await takeOverShortcut()
}

/** GNOME Shell eklenti durumları (org.gnome.Shell.Extensions `state`). */
const STATE_ENABLED = [1, 8]
const STATE_ERROR = [3, 4]

export async function integrationState(): Promise<IntegrationState> {
  const gnome = isGnome()
  if (!gnome) {
    return {
      platform: 'linux',
      gnome,
      session: sessionType(),
      extension: 'not-installed',
      conflicts: [],
      shortcut: '',
      tookOver: false,
      ready: false
    }
  }
  const version = await shell.version()
  let extension: ExtensionStatus
  let extensionError: string | undefined
  if (version >= EXTENSION_API) {
    extension = 'active'
  } else if (version > 0) {
    // Eski sürüm çalışıyor (yükleyicisiz eklenti yeni dosyaları bir sonraki oturumda yükler); temel işler sürer.
    extension = 'outdated'
  } else {
    const info = await extensionInfo()
    const state = Number(info['state'] ?? 0)
    if (!Object.keys(info).length || state === 0)
      extension = existsSync(join(installedDir(), 'metadata.json'))
        ? 'needs-relogin'
        : 'not-installed'
    else if (STATE_ERROR.includes(state)) {
      extension = 'error'
      extensionError = typeof info['error'] === 'string' ? info['error'] : undefined
    } else if (STATE_ENABLED.includes(state)) extension = version > 0 ? 'needs-relogin' : 'error'
    else extension = 'disabled'
  }
  const conflicts = await shortcutConflicts()
  return {
    platform: 'linux',
    gnome,
    session: sessionType(),
    extension,
    extensionError,
    conflicts,
    shortcut: store.integration.shortcutEnabled ? currentShortcut() : '',
    tookOver: store.integration.savedBindings.length > 0,
    ready: version > 0 && grabbed && conflicts.length === 0
  }
}

export async function enableExtension(): Promise<void> {
  if (!desktopTouchAllowed()) return
  await shellExtensions('EnableExtension', 's', [EXTENSION_UUID])
}

/** GNOME'un kendi oturumu kapatma onayını açar. */
export function logout(): void {
  if (!desktopTouchAllowed()) return
  spawn('gnome-session-quit', ['--logout'], { detached: true, stdio: 'ignore' }).unref()
}
