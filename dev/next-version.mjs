// Yayımlanacak sürüm: package.json'daki sürüm son `v*` etiketinden büyükse o (elle artırılan büyük/küçük sürüm),
// değilse son etiketin yama numarası bir artırılır. Kullanım: node dev/next-version.mjs (sonuç stdout'a yazılır)
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const parse = (v) => {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v.trim())
  return m ? m.slice(1).map(Number) : null
}
const compare = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]

/** Sürüm etiketlerinden ve package.json sürümünden yayımlanacak sürümü hesaplar. */
export function nextVersion(packageVersion, tags) {
  const pkg = parse(packageVersion)
  if (!pkg) throw new Error(`Geçersiz package.json sürümü: ${packageVersion}`)
  const latest = tags.map(parse).filter(Boolean).sort(compare).at(-1)
  if (!latest || compare(pkg, latest) > 0) return pkg.join('.')
  return [latest[0], latest[1], latest[2] + 1].join('.')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = path.resolve(import.meta.dirname, '..')
  const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  const tags = execFileSync('git', ['tag', '--list', 'v*'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
  console.log(nextVersion(version, tags))
}
