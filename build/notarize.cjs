// macOS: imzalanan uygulamayı Apple onayına (notarization) gönderir ve onay damgasını uygulamaya ekler. Damga Apple'ın
// sunucusunda onaydan bir süre sonra görünebildiği (bu sürede sunucu 503 döndürebildiği) için ekleme aralıklarla yeniden
// denenir. APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD ve APPLE_TEAM_ID yoksa (yerel ya da PR derlemesi) onay atlanır.
const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const STAPLE_ATTEMPTS = 10
const STAPLE_DELAY_MS = 30_000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** notarytool'un JSON çıktısındaki son nesne (bekleme sırasında başka satırlar da yazabilir). */
function lastJson(text) {
  const lines = String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('{'))
  for (const line of lines.reverse()) {
    try {
      return JSON.parse(line)
    } catch {
      // JSON olmayan satır
    }
  }
  return null
}

exports.default = async function notarize(context) {
  if (context.electronPlatformName !== 'darwin') return
  const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID } = process.env
  if (!APPLE_ID || !APPLE_APP_SPECIFIC_PASSWORD || !APPLE_TEAM_ID) {
    console.log(
      '  • notarization skipped  reason=APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD or APPLE_TEAM_ID is not set'
    )
    return
  }
  const credentials = [
    '--apple-id',
    APPLE_ID,
    '--password',
    APPLE_APP_SPECIFIC_PASSWORD,
    '--team-id',
    APPLE_TEAM_ID
  ]
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'upaste-notarize-'))
  const zip = path.join(dir, 'app.zip')
  try {
    execFileSync('ditto', ['-c', '-k', '--keepParent', app, zip])
    console.log(`  • notarizing  app=${path.basename(app)} arch=${context.arch}`)
    let output
    try {
      output = execFileSync(
        'xcrun',
        ['notarytool', 'submit', zip, ...credentials, '--wait', '--output-format', 'json'],
        { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
      )
    } catch (err) {
      output = err.stdout
    }
    const result = lastJson(output)
    if (!result || result.status !== 'Accepted') {
      let log = ''
      if (result?.id) {
        try {
          log = execFileSync('xcrun', ['notarytool', 'log', result.id, ...credentials], {
            encoding: 'utf8'
          })
        } catch {
          // ayrıntılı kayıt alınamadı
        }
      }
      throw new Error(
        `Notarization ${result?.status ?? 'failed'} (id ${result?.id ?? '?'})\n${log}`
      )
    }
    console.log(`  • notarization accepted  id=${result.id}`)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
  for (let attempt = 1; ; attempt++) {
    try {
      execFileSync('xcrun', ['stapler', 'staple', app], { stdio: 'pipe' })
      console.log('  • notarization ticket stapled')
      return
    } catch (err) {
      if (attempt >= STAPLE_ATTEMPTS)
        throw new Error(`Stapling failed after ${attempt} attempts: ${err.stderr || err.message}`)
      console.log(`  • stapling attempt ${attempt} failed, retrying in ${STAPLE_DELAY_MS / 1000} s`)
      await sleep(STAPLE_DELAY_MS)
    }
  }
}
