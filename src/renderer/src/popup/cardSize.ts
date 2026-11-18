// Küçük penceredeki kartın ölçüleri: resmin yüklenmeden önce ayrılan yeri ve sanal listenin kart yüksekliği tahmini.
import type { CSSProperties } from 'react'
import type { PopupItem } from '@shared/types'

/** Küçük penceredeki resmin yüksekliği (Tailwind max-h-32). */
const THUMB_MAX_HEIGHT = 128
/** Kartın içerik dışı yüksekliği: üst şerit (h-8), alt şerit (h-7), içerik dolgusu (py-2.5) ve kenarlık. */
const CARD_CHROME = 32 + 28 + 20 + 2
/** Kartın yatay dolgusu ve kenarlığı (px-3, border). */
const CARD_INSET = 24 + 2
const TEXT_LINE = 18
const TEXT_MAX_HEIGHT = 90

/**
 * Küçük penceredeki kartın yüksekliği (`width`: kartın genişliği). Resimde kesin, metinde satır sonlarından tahmin;
 * sanal liste kartları ilk çizimde doğru yere koysun, ölçüm geldiğinde aşağıdakiler kaymasın diye.
 */
export function cardHeight(item: PopupItem, width: number): number {
  if (item.kind === 'image' && item.image && item.image.width > 0 && item.image.height > 0) {
    const { width: w, height: h } = item.image
    const shown = Math.min(width - CARD_INSET, w, (THUMB_MAX_HEIGHT * w) / h)
    return CARD_CHROME + Math.min(THUMB_MAX_HEIGHT, (shown * h) / w)
  }
  const lines = (item.preview ?? '').split('\n').length
  return CARD_CHROME + Math.min(TEXT_MAX_HEIGHT, lines * TEXT_LINE)
}

/**
 * Resim yüklenmeden önce de yerini tutan boyut: en-boy oranı korunur, genişlik kartı, alanı ve en çok yüksekliği
 * aşmaz (resmin kendiliğinden aldığı boyutla aynı).
 */
export function thumbStyle(width: number, height: number): CSSProperties | undefined {
  if (!(width > 0 && height > 0)) return undefined
  const fit = Math.round((THUMB_MAX_HEIGHT * width) / height)
  return { aspectRatio: `${width} / ${height}`, width: `min(100%, ${width}px, ${fit}px)` }
}
