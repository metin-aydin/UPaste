// Çeviri denetimi: her dilde en.ts'teki bütün anahtarlar aynı sırada ve aynı yer tutucularla bulunmalı.
// Kullanım: node dev/i18n-check.mjs (birim testlerinin i18n bölümünü çalıştırır).
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const res = spawnSync(process.execPath, [path.join(root, 'dev/run-unit-tests.mjs'), 'i18n'], {
  stdio: 'inherit'
})
process.exit(res.status ?? 1)
