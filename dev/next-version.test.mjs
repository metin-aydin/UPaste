// Yayın sürümü hesabı birim testi. Kullanım: node dev/next-version.test.mjs
import { nextVersion } from './next-version.mjs'

let failed = false
const check = (name, actual, expected) => {
  const ok = actual === expected
  if (!ok) failed = true
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` — ${actual} (beklenen ${expected})`}`)
}
const throws = (name, fn) => {
  let thrown = false
  try {
    fn()
  } catch {
    thrown = true
  }
  if (!thrown) failed = true
  console.log(`${thrown ? 'ok  ' : 'FAIL'} ${name}`)
}

check('no tags: package version', nextVersion('0.2.0', []), '0.2.0')
check('tag equals package: patch bump', nextVersion('0.2.0', ['v0.2.0']), '0.2.1')
check('highest tag wins', nextVersion('0.2.0', ['v0.2.0', 'v0.2.3', 'v0.2.1']), '0.2.4')
check('numeric, not string order', nextVersion('0.2.0', ['v0.2.9', 'v0.2.10']), '0.2.11')
check('package bumped above tags', nextVersion('0.3.0', ['v0.2.7']), '0.3.0')
check('major bump', nextVersion('1.0.0', ['v0.9.4']), '1.0.0')
check('package below tags: patch of tag', nextVersion('0.1.0', ['v0.2.2']), '0.2.3')
check('foreign tags ignored', nextVersion('0.2.0', ['latest', 'v1', 'v0.2.0-beta.1']), '0.2.0')
throws('invalid package version', () => nextVersion('0.2', []))

process.exitCode = failed ? 1 : 0
