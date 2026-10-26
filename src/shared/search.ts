// Geçmişte arama: büyük/küçük harf ve aksan duyarsız. Türkçe İ/ı/I/i aynı harf sayılır, böylece "istanbul"
// araması "İSTANBUL" ve "Istanbul"u da bulur; diğer dillerde aksanlar (é, ñ, ü…) yok sayılır.

const DOTTED = /[İIı]/g
const MARKS = /\p{M}/gu

/** Karşılaştırma için katlanmış biçim. */
export function fold(text: string): string {
  return text.replace(DOTTED, 'i').normalize('NFKD').replace(MARKS, '').toLowerCase()
}

export function queryTokens(query: string): string[] {
  return fold(query).split(/\s+/).filter(Boolean)
}

/** Katlanmış metin tüm sözcükleri içeriyor mu. */
export function matchesTokens(folded: string, tokens: string[]): boolean {
  return tokens.every((t) => folded.includes(t))
}

export type Range = [start: number, end: number]

/**
 * Sözcüklerin özgün metindeki yerleri (vurgulamak için). Katlama harf sayısını değiştirebildiği için her özgün
 * karakterin katlanmış metindeki karşılığı ayrıca izlenir.
 */
export function matchRanges(text: string, tokens: string[], limit = 50): Range[] {
  if (!tokens.length || !text) return []
  let folded = ''
  const origin: number[] = []
  let i = 0
  for (const ch of text) {
    const f = fold(ch)
    for (let k = 0; k < f.length; k++) origin.push(i)
    folded += f
    i += ch.length
  }
  origin.push(text.length)
  const ranges: Range[] = []
  for (const t of tokens) {
    let from = 0
    for (;;) {
      const at = folded.indexOf(t, from)
      if (at < 0 || ranges.length >= limit) break
      const start = origin[at]
      const lastOrigin = origin[at + t.length - 1]
      const lastChar = text.codePointAt(lastOrigin) ?? 0
      const end = lastOrigin + (lastChar > 0xffff ? 2 : 1)
      ranges.push([start, end])
      from = at + t.length
    }
  }
  ranges.sort((a, b) => a[0] - b[0])
  const merged: Range[] = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([r[0], r[1]])
  }
  return merged
}
