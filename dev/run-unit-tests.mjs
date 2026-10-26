// dev/tests/*.test.ts dosyalarını esbuild ile paketleyip node'da sırayla çalıştırır. Kullanım:
//   node dev/run-unit-tests.mjs [ad-parçası]
import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const filter = process.argv[2] ?? ''
const files = fs
  .readdirSync(path.join(root, 'dev/tests'))
  .filter((f) => f.endsWith('.test.ts') && f.includes(filter))
  .sort()
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'upaste-unit-'))
let failed = 0
for (const file of files) {
  const outfile = path.join(out, file.replace(/\.ts$/, '.mjs'))
  await build({
    entryPoints: [path.join(root, 'dev/tests', file)],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    alias: { '@shared': path.join(root, 'src/shared') },
    external: ['electron'],
    logLevel: 'error'
  })
  const res = spawnSync(process.execPath, [outfile], { stdio: 'inherit', cwd: root })
  if (res.status !== 0) failed++
}
// Düz JavaScript betiklerinin testleri (dev/*.test.mjs) paketlenmeden çalışır.
const plain = fs
  .readdirSync(path.join(root, 'dev'))
  .filter((f) => f.endsWith('.test.mjs') && f.includes(filter))
  .sort()
for (const file of plain) {
  const res = spawnSync(process.execPath, [path.join(root, 'dev', file)], {
    stdio: 'inherit',
    cwd: root
  })
  if (res.status !== 0) failed++
}
fs.rmSync(out, { recursive: true, force: true })
const total = files.length + plain.length
console.log(failed ? `\n${failed} test dosyası başarısız` : `\n${total} test dosyası geçti`)
process.exit(failed ? 1 : 0)
