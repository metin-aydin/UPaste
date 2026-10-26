// Pano geçmişi: kayıtlar `history/index.json` dizininde, resimler `history/images/` altında PNG olarak tutulur.
// Aynı içerik yeniden kopyalanınca yeni kayıt açılmaz, mevcut kayıt en üste alınır.
import { app, type NativeImage } from 'electron'
import { createHash, randomUUID } from 'crypto'
import { EventEmitter } from 'events'
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import { expiredIds, overflowIds } from '@shared/retention'
import { fold, matchesTokens, matchRanges, queryTokens } from '@shared/search'
import type { HistoryItem, HistoryStats, PopupFilter, PopupItem } from '@shared/types'
import { writeJsonAtomic } from './store'

/** Sabitlenmemiş kayıt üst sınırı; süre sınırı "süresiz" olsa da geçmiş bundan büyümez. */
export const MAX_ITEMS = 1000
/** Bundan uzun metinler kaydedilmez (ör. büyük günlük dosyaları). */
export const MAX_TEXT_LENGTH = 4_000_000
/** Bundan çok pikselli resimler kaydedilmez. */
export const MAX_IMAGE_PIXELS = 50_000_000
const PREVIEW_LENGTH = 1200
const SEARCH_LENGTH = 200_000
const THUMB_WIDTH = 720
const SAVE_DELAY_MS = 400
export const IMAGE_SCHEME = 'upaste-img'

const sha1 = (data: string | Buffer): string => createHash('sha1').update(data).digest('hex')

class HistoryStore extends EventEmitter {
  private dir = ''
  private imagesDir = ''
  private items: HistoryItem[] = []
  private folded = new Map<string, string>()
  private saveTimer: NodeJS.Timeout | null = null

  load(): void {
    this.dir = join(app.getPath('userData'), 'history')
    this.imagesDir = join(this.dir, 'images')
    mkdirSync(this.imagesDir, { recursive: true })
    try {
      const data = JSON.parse(readFileSync(join(this.dir, 'index.json'), 'utf8')) as {
        items?: HistoryItem[]
      }
      this.items = (data.items ?? []).filter(
        (i) => i && i.id && (i.kind === 'text' || i.kind === 'image')
      )
      this.items.sort((a, b) => b.createdAt - a.createdAt)
    } catch {
      this.items = []
    }
  }

  get size(): number {
    return this.items.length
  }

  get(id: string): HistoryItem | undefined {
    return this.items.find((i) => i.id === id)
  }

  imagePath(id: string, thumb = false): string {
    return join(this.imagesDir, `${id}${thumb ? '.thumb' : ''}.png`)
  }

  /** Metin kaydı; aynı metin varsa öne alınır. Boş metin ve sınırı aşan metin yok sayılır. */
  addText(text: string, html?: string): HistoryItem | null {
    if (!text.trim() || text.length > MAX_TEXT_LENGTH) return null
    const hash = sha1('t:' + text)
    const existing = this.items.find((i) => i.hash === hash)
    if (existing) {
      if (html) existing.html = html
      this.touch(existing.id)
      return existing
    }
    const item: HistoryItem = {
      id: randomUUID(),
      kind: 'text',
      createdAt: Date.now(),
      pinned: false,
      hash,
      text,
      ...(html ? { html } : {})
    }
    this.insert(item)
    return item
  }

  /** Resim kaydı; özet çözülmüş piksellerden alınır, böylece aynı resmin farklı kodlaması da aynı sayılır. */
  addImage(image: NativeImage): HistoryItem | null {
    if (image.isEmpty()) return null
    const { width, height } = image.getSize()
    if (!width || !height || width * height > MAX_IMAGE_PIXELS) return null
    const hash = sha1(Buffer.concat([Buffer.from(`i:${width}x${height}:`), image.toBitmap()]))
    const existing = this.items.find((i) => i.hash === hash)
    if (existing) {
      this.touch(existing.id)
      return existing
    }
    const id = randomUUID()
    const png = image.toPNG()
    writeFileSync(this.imagePath(id), png)
    const thumb =
      width > THUMB_WIDTH ? image.resize({ width: THUMB_WIDTH, quality: 'good' }) : image
    writeFileSync(this.imagePath(id, true), thumb.toPNG())
    const item: HistoryItem = {
      id,
      kind: 'image',
      createdAt: Date.now(),
      pinned: false,
      hash,
      image: { width, height, bytes: png.length }
    }
    this.insert(item)
    return item
  }

  touch(id: string): void {
    const item = this.get(id)
    if (!item) return
    item.createdAt = Date.now()
    this.items.sort((a, b) => b.createdAt - a.createdAt)
    this.changed()
  }

  setPinned(id: string, pinned: boolean): void {
    const item = this.get(id)
    if (!item || item.pinned === pinned) return
    item.pinned = pinned
    this.changed()
  }

  remove(id: string): void {
    this.drop([id])
  }

  clear(includePinned: boolean): void {
    this.drop(this.items.filter((i) => includePinned || !i.pinned).map((i) => i.id))
  }

  /** Süresi dolan ve üst sınırı aşan kayıtları siler. */
  prune(retentionDays: number, now = Date.now()): void {
    const ids = new Set([
      ...expiredIds(this.items, retentionDays, now),
      ...overflowIds(this.items, MAX_ITEMS)
    ])
    if (ids.size) this.drop([...ids])
  }

  list(query: string, filter: PopupFilter, limit = 500): PopupItem[] {
    const tokens = queryTokens(query)
    const matches = this.items.filter((item) => {
      if (filter === 'text' && item.kind !== 'text') return false
      if (filter === 'image' && item.kind !== 'image') return false
      if (filter === 'pinned' && !item.pinned) return false
      if (!tokens.length) return true
      return item.kind === 'text' && matchesTokens(this.foldedText(item), tokens)
    })
    const ordered = [...matches.filter((i) => i.pinned), ...matches.filter((i) => !i.pinned)]
    return ordered.slice(0, limit).map((item) => this.toPopupItem(item, tokens))
  }

  stats(): HistoryStats {
    let bytes = 0
    const size = (file: string): number => {
      try {
        return statSync(file).size
      } catch {
        return 0
      }
    }
    for (const item of this.items)
      if (item.kind === 'image')
        bytes += size(this.imagePath(item.id)) + size(this.imagePath(item.id, true))
    bytes += size(join(this.dir, 'index.json'))
    return {
      total: this.items.length,
      text: this.items.filter((i) => i.kind === 'text').length,
      images: this.items.filter((i) => i.kind === 'image').length,
      pinned: this.items.filter((i) => i.pinned).length,
      bytes
    }
  }

  /** Bekleyen yazmayı hemen yapar (kapanırken). */
  flush(): void {
    if (!this.saveTimer) return
    clearTimeout(this.saveTimer)
    this.saveTimer = null
    this.save()
  }

  private foldedText(item: HistoryItem): string {
    let f = this.folded.get(item.id)
    if (f === undefined) {
      f = fold((item.text ?? '').slice(0, SEARCH_LENGTH))
      this.folded.set(item.id, f)
    }
    return f
  }

  private toPopupItem(item: HistoryItem, tokens: string[]): PopupItem {
    if (item.kind === 'image') {
      return {
        id: item.id,
        kind: 'image',
        createdAt: item.createdAt,
        pinned: item.pinned,
        image: { ...item.image!, thumb: `${IMAGE_SCHEME}://thumb/${item.id}` }
      }
    }
    const text = item.text ?? ''
    let start = 0
    if (tokens.length) {
      // Eşleşme önizlemenin dışında kalıyorsa önizleme eşleşmenin biraz öncesinden başlar.
      const at = this.foldedText(item).indexOf(tokens[0])
      if (at > PREVIEW_LENGTH / 3) start = Math.max(0, at - 60)
    }
    const body = text.slice(start, start + PREVIEW_LENGTH)
    const preview = start > 0 ? '…' + body : body
    return {
      id: item.id,
      kind: 'text',
      createdAt: item.createdAt,
      pinned: item.pinned,
      preview,
      length: text.length,
      hasHtml: !!item.html,
      ranges: tokens.length ? matchRanges(preview, tokens) : undefined
    }
  }

  private insert(item: HistoryItem): void {
    this.items.unshift(item)
    this.changed()
  }

  private drop(ids: string[]): void {
    if (!ids.length) return
    const set = new Set(ids)
    for (const item of this.items) {
      if (!set.has(item.id)) continue
      this.folded.delete(item.id)
      if (item.kind === 'image') {
        rmSync(this.imagePath(item.id), { force: true })
        rmSync(this.imagePath(item.id, true), { force: true })
      }
    }
    this.items = this.items.filter((i) => !set.has(i.id))
    this.changed()
  }

  private changed(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      this.save()
    }, SAVE_DELAY_MS)
    this.emit('changed')
  }

  private save(): void {
    try {
      writeJsonAtomic(join(this.dir, 'index.json'), { version: 1, items: this.items })
    } catch (err) {
      console.error('Geçmiş kaydedilemedi:', err)
    }
  }
}

export const history = new HistoryStore()
