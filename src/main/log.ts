// Tanı kaydı: olay akışı (kısayol ve odak bilgisi, pano biçimleri, yakalama, yapıştırma) günlük dosyasına yazılır:
// macOS ~/Library/Logs/UPaste/main.log, Windows %APPDATA%\UPaste\logs\main.log, Linux ~/.config/UPaste/logs/main.log.
// Kopyalanan içerik yazılmaz. Dosya 1 MB'ı geçince bir önceki kopyanın (main.log.1) yerine geçer. `UPASTE_DEBUG=1` ile
// aynı satırlar standart çıktıya da yazılır.
import { app } from 'electron'
import { appendFileSync, mkdirSync, renameSync, statSync } from 'fs'
import { join } from 'path'

const echo = process.env['UPASTE_DEBUG'] === '1'
const MAX_BYTES = 1024 * 1024
let file: string | null | undefined

/** Günlük dosyasının yolu; klasör oluşturulamazsa null. */
export function logFile(): string | null {
  if (file !== undefined) return file
  try {
    const dir = app.getPath('logs')
    mkdirSync(dir, { recursive: true })
    file = join(dir, 'main.log')
  } catch {
    file = null
  }
  return file
}

export function debug(...args: unknown[]): void {
  const line = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
  if (echo) console.log('[upaste]', line)
  const path = logFile()
  if (!path) return
  try {
    try {
      if (statSync(path).size > MAX_BYTES) renameSync(path, `${path}.1`)
    } catch {
      // Dosya henüz yok.
    }
    appendFileSync(path, `${new Date().toISOString()} ${line}\n`)
  } catch {
    // Kayıt yazılamazsa uygulama çalışmaya devam eder.
  }
}
