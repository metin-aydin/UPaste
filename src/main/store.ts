// Ayarlar (`settings.json`) ve masaüstü bütünleşmesinin durumu (`integration.json`): kullanıcı veri klasöründe,
// yarım kalmış yazma dosyayı bozmasın diye geçici dosyaya yazılıp yeniden adlandırılır.
import { app } from 'electron'
import { EventEmitter } from 'events'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import { DEFAULT_SETTINGS, type Settings } from '@shared/types'

export function readJson<T>(file: string, fallback: T): T {
  try {
    return { ...fallback, ...(JSON.parse(readFileSync(file, 'utf8')) as Partial<T>) }
  } catch {
    return fallback
  }
}

export function writeJsonAtomic(file: string, data: unknown): void {
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(data, null, 2))
  renameSync(tmp, file)
}

/** UPaste'in Super+V için devre dışı bıraktığı bağlamalar; "Öncekini Geri Yükle" bunları geri yazar. */
export interface SavedBinding {
  schema: string
  /** Yeniden konumlanabilir şemalarda (özel kısayollar) yol. */
  path?: string
  key: string
  /** Anahtarın UPaste değiştirmeden önceki değeri (GVariant metni). */
  previous: string
  name: string
}

export interface IntegrationData {
  savedBindings: SavedBinding[]
  /** UPaste'in kısayolu (GTK hızlandırıcı biçiminde). */
  shortcut: string
  /** Kısayol UPaste'te; "Öncekini Geri Yükle" ile kapanır. */
  shortcutEnabled: boolean
  /** İlk açılışta kurulum sayfası bir kez kendiliğinden açılır. */
  setupShown: boolean
}

class Store extends EventEmitter {
  private dir = ''
  settings: Settings = { ...DEFAULT_SETTINGS }
  integration: IntegrationData = {
    savedBindings: [],
    shortcut: '<Super>v',
    shortcutEnabled: true,
    setupShown: false
  }

  load(): void {
    this.dir = app.getPath('userData')
    mkdirSync(this.dir, { recursive: true })
    this.settings = readJson(join(this.dir, 'settings.json'), { ...DEFAULT_SETTINGS })
    this.integration = readJson(join(this.dir, 'integration.json'), this.integration)
  }

  updateSettings(patch: Partial<Settings>): Settings {
    const next = { ...this.settings }
    for (const [k, v] of Object.entries(patch) as [keyof Settings, unknown][]) {
      if (!(k in DEFAULT_SETTINGS) || typeof v !== typeof DEFAULT_SETTINGS[k]) continue
      ;(next as Record<string, unknown>)[k] = v
    }
    next.retentionDays = Math.max(0, Math.min(3650, Math.round(next.retentionDays)))
    this.settings = next
    writeJsonAtomic(join(this.dir, 'settings.json'), this.settings)
    this.emit('settings', this.settings)
    return this.settings
  }

  updateIntegration(patch: Partial<IntegrationData>): void {
    this.integration = { ...this.integration, ...patch }
    writeJsonAtomic(join(this.dir, 'integration.json'), this.integration)
  }
}

export const store = new Store()
