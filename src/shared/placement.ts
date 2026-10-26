// Geçmiş penceresinin ekrandaki yeri: odaklı metin alanının (ya da imlecin) hemen altına, sol kenarları hizalı.
// Altta yer yoksa üstüne açılır; ikisinde de tam boy sığmazsa geniş olan tarafta kısaltılır. Pencere her zaman
// metin alanının bulunduğu ekranın çalışma alanında kalır (çoklu ekran, farklı yükseklikte yerleşimler).

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export interface Placement extends Rect {
  /** Pencere metin alanının üstünde açıldı. */
  above: boolean
}

export const POPUP_GAP = 6
export const POPUP_MIN_HEIGHT = 220

const center = (r: Rect): { x: number; y: number } => ({
  x: r.x + r.width / 2,
  y: r.y + r.height / 2
})

const contains = (r: Rect, p: { x: number; y: number }): boolean =>
  p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height

/** Noktanın bulunduğu, yoksa ona en yakın çalışma alanı. */
export function areaFor(point: { x: number; y: number }, areas: Rect[]): Rect {
  const inside = areas.find((a) => contains(a, point))
  if (inside) return inside
  let best = areas[0]
  let bestDistance = Infinity
  for (const a of areas) {
    const dx = Math.max(a.x - point.x, 0, point.x - (a.x + a.width))
    const dy = Math.max(a.y - point.y, 0, point.y - (a.y + a.height))
    const d = dx * dx + dy * dy
    if (d < bestDistance) {
      bestDistance = d
      best = a
    }
  }
  return best
}

const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max)

export function placePopup(
  anchor: Rect,
  areas: Rect[],
  size: Size,
  gap = POPUP_GAP,
  minHeight = POPUP_MIN_HEIGHT
): Placement {
  const area = areaFor(center(anchor), areas)
  const width = Math.min(size.width, area.width)
  const anchorBottom = anchor.y + anchor.height
  const below = area.y + area.height - (anchorBottom + gap)
  const aboveSpace = anchor.y - gap - area.y

  let above = false
  let height = size.height
  if (below >= size.height) {
    height = size.height
  } else if (aboveSpace >= size.height) {
    above = true
  } else if (below >= aboveSpace) {
    height = Math.max(Math.min(size.height, below), Math.min(minHeight, size.height))
  } else {
    above = true
    height = Math.max(Math.min(size.height, aboveSpace), Math.min(minHeight, size.height))
  }
  height = Math.min(height, area.height)

  const x = clamp(Math.round(anchor.x), area.x, area.x + area.width - width)
  const rawY = above ? anchor.y - gap - height : anchorBottom + gap
  const y = clamp(Math.round(rawY), area.y, area.y + area.height - height)
  return { x, y, width, height, above }
}

/** Dikdörtgen pencere çerçevesinin (biraz pay bırakılarak) içinde mi. */
export function insideFrame(r: Rect, frame: Rect, slack = 8): boolean {
  return (
    r.x >= frame.x - slack &&
    r.y >= frame.y - slack &&
    r.x + r.width <= frame.x + frame.width + slack &&
    r.y + r.height <= frame.y + frame.height + slack
  )
}
