// Yalnız dev/nested-shell.sh'nin açtığı yalıtılmış kabukta yüklenir: testlerin org.gnome.Shell.Eval ve
// org.gnome.Shell.Screenshot kullanabilmesi için güvensiz kipi açar, açılıştaki genel görünümü kapatır.
import * as Main from 'resource:///org/gnome/shell/ui/main.js'
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js'

export default class NestedDevtools extends Extension {
  enable() {
    global.context.unsafe_mode = true
    if (Main.layoutManager._startingUp)
      this._startupId = Main.layoutManager.connect('startup-complete', () => Main.overview.hide())
    else Main.overview.hide()
  }

  disable() {
    if (this._startupId) Main.layoutManager.disconnect(this._startupId)
    this._startupId = 0
    global.context.unsafe_mode = false
  }
}
