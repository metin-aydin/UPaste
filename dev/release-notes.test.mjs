// Sürüm notu temizleme birim testi. Kullanım: node dev/release-notes.test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { cleanNotes } from './release-notes.mjs'

let failed = false
const check = (name, actual, expected) => {
  const ok = actual === expected
  if (!ok) failed = true
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `\n  got:      ${JSON.stringify(actual)}\n  expected: ${JSON.stringify(expected)}`}`
  )
}

const template = fs
  .readFileSync(path.join(import.meta.dirname, '../.github/pull_request_template.md'), 'utf8')
  .replace(/\r\n/g, '\n')
check('untouched template is empty', cleanNotes(template), '')
check(
  'filled section kept, empty ones dropped',
  cleanNotes(template.replace('## New\n\n-', '## New\n\n- In-app updates')),
  '## New\n\n- In-app updates'
)
check(
  'plain text kept',
  cleanNotes('First public release.\r\n\r\n\r\n- One\n- Two\n'),
  'First public release.\n\n- One\n- Two'
)
check('heading followed by heading dropped', cleanNotes('## A\n## B\ntext'), '## B\ntext')

process.exitCode = failed ? 1 : 0
