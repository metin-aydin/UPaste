// UPaste GNOME Shell eklentisinin yükleyicisi. Asıl iş çekirdektedir (`core-<sürüm>.js`, geliştirmede `core.js`).
// GJS bir modül adresini oturum boyunca yalnız bir kez yükler; bu yüzden her çekirdek sürümü ayrı dosya adıyla gelir.
// Yükleyici klasörü izler: uygulama daha yeni bir çekirdek bıraktığında eskisi kapatılır, yenisi açılır. Böylece
// eklenti güncellemeleri oturumu kapatıp açmadan devreye girer.
import Gio from 'gi://Gio'
import GLib from 'gi://GLib'

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js'

const CORE_FILE = /^core(?:-(\d+))?\.js$/
const SCAN_DELAY_MS = 300

export default class UPasteExtension extends Extension {
  enable() {
    this._session = {}
    this._core = null
    this._coreVersion = -1
    this._failedVersion = -1
    this._loading = false
    this._monitor = this.dir.monitor_directory(Gio.FileMonitorFlags.WATCH_MOVES, null)
    this._monitorId = this._monitor.connect('changed', () => this._scheduleScan())
    this._scan()
  }

  disable() {
    this._session = null
    if (this._scanId) GLib.source_remove(this._scanId)
    this._scanId = 0
    this._monitor?.disconnect(this._monitorId)
    this._monitor?.cancel()
    this._monitor = null
    this._core?.disable()
    this._core = null
  }

  _scheduleScan() {
    if (this._scanId) GLib.source_remove(this._scanId)
    this._scanId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, SCAN_DELAY_MS, () => {
      this._scanId = 0
      this._scan()
      return GLib.SOURCE_REMOVE
    })
  }

  /** Klasördeki en yeni çekirdek dosyası ve sürümü (`core.js` = 0). */
  _newestCore() {
    let newest = null
    const children = this.dir.enumerate_children(
      'standard::name',
      Gio.FileQueryInfoFlags.NONE,
      null
    )
    for (let info = children.next_file(null); info; info = children.next_file(null)) {
      const match = CORE_FILE.exec(info.get_name())
      if (!match) continue
      const version = Number(match[1] ?? 0)
      if (!newest || version > newest.version)
        newest = { version, file: this.dir.get_child(info.get_name()) }
    }
    children.close(null)
    return newest
  }

  /** Yüklü olandan yeni bir çekirdek varsa onu içe aktarır ve öncekinin yerine açar. */
  _scan() {
    if (this._loading) return
    let newest
    try {
      newest = this._newestCore()
    } catch (err) {
      logError(err, 'UPaste: extension folder could not be read')
      return
    }
    if (!newest || newest.version <= this._coreVersion || newest.version === this._failedVersion)
      return
    const session = this._session
    this._loading = true
    import(newest.file.get_uri())
      .then((module) => {
        if (session !== this._session) return
        this._loading = false
        this._swap(new module.UPasteCore(), newest.version)
        this._scan()
      })
      .catch((err) => {
        if (session !== this._session) return
        this._loading = false
        this._failedVersion = newest.version
        logError(err, `UPaste: core ${newest.version} could not be loaded`)
      })
  }

  /** Yeni çekirdeği açar; açılamazsa önceki çekirdek yeniden açılır. */
  _swap(core, version) {
    const previous = this._core
    previous?.disable()
    try {
      core.enable()
    } catch (err) {
      logError(err, `UPaste: core ${version} could not be enabled`)
      this._failedVersion = version
      try {
        core.disable()
      } catch {
        // Yarım açılmış çekirdeğin kapatılamayan parçaları yok sayılır.
      }
      previous?.enable()
      return
    }
    this._core = core
    this._coreVersion = version
  }
}
