// Panoyu izler ve her yeni içeriği geçmişe ekler. Kısayolla yapılan kopyalamalar kadar uygulamaların kendi
// yaptığı (programatik) kopyalamalar da yakalanır: GNOME eklentisi pano sahibi her değiştiğinde haber verir;
// eklenti yoksa pano düzenli aralıklarla yoklanır.
import { clipboard, ClipboardItem, nativeImage } from 'electron'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { history } from './history'
import type { HistoryItem } from '@shared/types'
import { debug } from './log'

const POLL_MS = 900
/** Pano sahibi zaman damgası bildirmiyorsa yalnız resim bulunan pano bu kadar yoklamada bir okunur. */
const IMAGE_POLL_EVERY = 3
const SIGNAL_DEBOUNCE_MS = 60
/** X11 seçim sahibinin edinme zamanı: her yeni kopyalamada değişir, içerik okunmadan değişiklik anlaşılır. */
const TIMESTAMP = 'electron application/osclipboard;format="TIMESTAMP"'

/** Parola yöneticilerinin "bu bir sırdır" işareti (KeePassXC, KDE); bu içerik kaydedilmez. */
const SECRET_FORMATS = [
  /passwordmanagerhint/i,
  /x-kde-passwordmanagerhint/i,
  /application\/x-secret/i
]

const sha1 = (data: string | Buffer): string => createHash('sha1').update(data).digest('hex')

const blobText = async (item: ClipboardItem, type: string): Promise<string> =>
  ((await item.getType(type as string)) as Blob).text()

async function blobBuffer(item: ClipboardItem, type: string): Promise<Buffer> {
  const blob = (await item.getType(type as string)) as Blob
  return Buffer.from(await blob.arrayBuffer())
}

class ClipboardWatcher {
  private timer: NodeJS.Timeout | null = null
  private signalTimer: NodeJS.Timeout | null = null
  private lastSignature = ''
  private polls = 0
  private writing = false
  private busy = false
  private again = false

  /** `signalled` true ise eklenti değişiklikleri bildiriyor demektir; yoklama yapılmaz. */
  start(signalled: () => boolean): void {
    this.stop()
    void this.signature().then((s) => (this.lastSignature = s))
    this.timer = setInterval(() => {
      if (signalled() || this.writing) return
      void this.poll()
    }, POLL_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  /** Eklenti panonun değiştiğini bildirdi. Arka arkaya gelen bildirimler tek okumaya indirilir. */
  changed(): void {
    if (this.signalTimer) clearTimeout(this.signalTimer)
    this.signalTimer = setTimeout(() => {
      this.signalTimer = null
      if (!this.writing) void this.capture(true)
    }, SIGNAL_DEBOUNCE_MS)
  }

  /** Biçim listesi ve (varsa) zaman damgası; yoksa metnin özeti. */
  private async signature(): Promise<string> {
    try {
      const [item] = await clipboard.read()
      if (!item) return ''
      const types = item.types
      if (types.includes(TIMESTAMP)) {
        const stamp = (await blobBuffer(item, TIMESTAMP)).toString('hex')
        return `${types.join(',')}|t:${stamp}`
      }
      return `${types.join(',')}|h:${sha1(await clipboard.readText())}`
    } catch {
      return ''
    }
  }

  private async poll(): Promise<void> {
    const signature = await this.signature()
    if (!signature) return
    const stamped = signature.includes('|t:')
    const imageOnly = signature.includes('image/') && !signature.includes('text/plain')
    if (signature !== this.lastSignature) {
      this.lastSignature = signature
      await this.capture(true)
    } else if (!stamped && imageOnly && ++this.polls % IMAGE_POLL_EVERY === 0) {
      // Zaman damgası olmayan panoda yeni resim aynı biçim listesiyle gelebilir; özet aynıysa geçmiş değişmez.
      await this.capture(false)
    }
  }

  /** Panodaki içeriği okur ve geçmişe ekler. Metin varsa metin, yalnız resim varsa resim kaydedilir. */
  async capture(includeText: boolean): Promise<HistoryItem | null> {
    if (this.busy) {
      this.again = true
      return null
    }
    this.busy = true
    try {
      return await this.read(includeText)
    } catch (err) {
      console.error('Pano okunamadı:', err)
      return null
    } finally {
      this.busy = false
      if (this.again) {
        this.again = false
        void this.capture(true)
      }
    }
  }

  private async read(includeText: boolean): Promise<HistoryItem | null> {
    const [item] = await clipboard.read()
    if (!item) return null
    const types = item.types
    debug('capture types', types.filter((t) => !t.startsWith('electron')).join(','))
    if (types.some((f) => SECRET_FORMATS.some((re) => re.test(f)))) return null
    if (includeText && types.includes('text/plain')) {
      const text = await clipboard.readText()
      if (text.trim()) {
        const html = types.includes('text/html') ? await blobText(item, 'text/html') : undefined
        return history.addText(text, html || undefined)
      }
    }
    const imageType = types.includes('image/png')
      ? 'image/png'
      : types.find((t) => t.startsWith('image/'))
    if (!imageType) return null
    return history.addImage(nativeImage.createFromBuffer(await blobBuffer(item, imageType)))
  }

  /**
   * Seçilen öğeyi panoya yazar. Metin birincil seçime (PRIMARY) de yazılır: yapıştırma Shift+Insert ile yapılır ve
   * bazı terminaller bu tuşla birincil seçimi yapıştırır.
   */
  async write(item: HistoryItem, plain: boolean, imagePath: (id: string) => string): Promise<void> {
    this.writing = true
    try {
      if (item.kind === 'image') {
        const png = readFileSync(imagePath(item.id))
        await clipboard.write([
          new ClipboardItem({ 'image/png': new Blob([new Uint8Array(png)], { type: 'image/png' }) })
        ])
      } else {
        const text = item.text ?? ''
        const data: Record<string, string> = { 'text/plain': text }
        if (!plain && item.html) data['text/html'] = item.html
        await clipboard.write([new ClipboardItem(data)])
        await clipboard.selection?.writeText(text)
      }
    } finally {
      this.lastSignature = await this.signature()
      this.writing = false
    }
  }
}

export const watcher = new ClipboardWatcher()
