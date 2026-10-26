// Geçmişten silinecek öğeler: saklama süresini aşanlar ve üst sınırın üstündeki en eski öğeler. Sabitlenen öğeler
// hiçbir zaman kendiliğinden silinmez.

export interface RetentionItem {
  id: string
  createdAt: number
  pinned: boolean
}

export const DAY_MS = 24 * 60 * 60 * 1000

/** `days` 0 ise süre sınırı yoktur. */
export function expiredIds(items: RetentionItem[], days: number, now: number): string[] {
  if (!days || days <= 0) return []
  const limit = now - days * DAY_MS
  return items.filter((i) => !i.pinned && i.createdAt < limit).map((i) => i.id)
}

/** Sabitlenmemiş öğeler `max` adedi aşınca en eskiler. */
export function overflowIds(items: RetentionItem[], max: number): string[] {
  const loose = items.filter((i) => !i.pinned).sort((a, b) => b.createdAt - a.createdAt)
  return loose.slice(max).map((i) => i.id)
}
