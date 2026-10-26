// Sürüm notu: PR açıklamasındaki HTML açıklamaları, boş maddeler ve içi boş başlıklar atılır.
// Kullanım: node dev/release-notes.mjs < açıklama.md
import fs from 'node:fs'

const HEADING = /^#{1,6}\s/

/** PR açıklamasını sürüm notuna çevirir; geriye bir şey kalmazsa boş metin döner. */
export function cleanNotes(text) {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .filter((line) => !/^\s*[-*]\s*$/.test(line))
  const kept = lines.filter((line, i) => {
    if (!HEADING.test(line)) return true
    const next = lines.slice(i + 1).find((l) => l.trim() !== '')
    return next !== undefined && !HEADING.test(next)
  })
  return kept
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(cleanNotes(fs.readFileSync(0, 'utf8')))
}
